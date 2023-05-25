const { DynamoDBClient, PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Converter } = require('aws-sdk/clients/dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const dynamoClient = new DynamoDBClient();
const ULID = require('ulid');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong.';
const sqsClient = new SQSClient({ region: "us-east-1" });

exports.lambdaHandler = async (event) => {
  let oldImage;
  let newImage;
  try {
    await Promise.all(event.Records.map(async (record) => {
      switch (record.eventName) {
        case 'INSERT':
          newImage = Converter.unmarshall(record.dynamodb.NewImage);
          console.log('Insert record: ', newImage);
          await exports.createAddActivity(newImage);
          break;
        case 'MODIFY':
          newImage = Converter.unmarshall(record.dynamodb.NewImage);
          oldImage = Converter.unmarshall(record.dynamodb.OldImage);
          console.log('modify record: ', newImage);
          await exports.createUpdateActivity(newImage, oldImage);
          break;
        case 'DELETE':
          oldImage = Converter.unmarshall(record.dynamodb.OldImage);
          console.log('Delete record: ', oldImage);
            break;
        default:
          break;
      }
    }));
  } catch (err) {
    console.log(err, err.stack);
    // add to DLQ
    await exports.sendMessageToQueue(newImage);
    // return shared.buildErrorResponse(500, exports.UNHANDLED_ERROR_MESSAGE);
  }
};

exports.createAddActivity = async (newImage) => {
  const GSI1SK = newImage.GSI1SK;
  if(GSI1SK === 'order#CREATED') {
     const params = exports.createAddActivityParams(newImage);
     await exports.addActivityRecord(params);
  }
};

exports.createAddActivityParams = (image) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      GSI1PK: `user#${image.keyParts.userId}`,
      GSI1SK: `order#CREATED`,
      data: {
        message: `User ${image.keyParts.userId} has created order ${image.keyParts.orderId}`
      },
      pk: `order#${image.keyParts.orderId}`,
      sk: `order#CREATED`
    })
  };
  
  return params;
};

exports.addActivityRecord = async (params) => {
  await dynamoClient.send(new PutItemCommand(params));
  return;
};

exports.createUpdateActivity = async (newImage, oldImage) => {
  const GSI1SK = newImage.GSI1SK;
  if(GSI1SK === 'order#REJECTED' || GSI1SK === 'order#CONFIRM') {
     const params = exports.createUpdateActivityParams(newImage);
     await exports.addActivityRecord(params);
  }
};

exports.createUpdateActivityParams = (image) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      GSI1PK: `user#${image.keyParts.userId}`,
      GSI1SK: image.GSI1SK,
      data: {
        message: `User ${image.keyParts.userId} has ${image.data.status}ED order ${image.keyParts.orderId}`
      },
      pk: `order#${image.keyParts.orderId}`,
      sk: `order#${image.data.status}`
    })
  };
  
  return params;
};

exports.sendMessageToQueue = async (message) => {
  const sendMessageCommand = new SendMessageCommand({
    QueueUrl: process.env.DLQArn,
    MessageBody: JSON.stringify(message)
  })
  await sqsClient.send(sendMessageCommand);
};