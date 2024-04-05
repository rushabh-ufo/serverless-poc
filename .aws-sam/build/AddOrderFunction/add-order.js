const { DynamoDBClient, PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const dynamoClient = new DynamoDBClient();
const ULID = require('ulid');

const requireWithFallback = require('node-require-fallback');
const shared = requireWithFallback('/opt/nodejs/serverless-poc-shared', '../../dependencies/serverless-poc-shared');

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong.';
const sqs = new SQSClient({ region: process.env.REGION });

exports.lambdaHandler = async (event) => {
  try {
    console.log('Event: ', JSON.stringify(event));
    const input = JSON.parse(event.body);
    console.log('Event: ', input);
    const orderId = ULID.ulid();
    const orderParams = exports.generateAddOrderParams(input, orderId);
    await exports.addOrderInDynamo(orderParams);
    console.log('Order added in the dynamo');
    const addOrderToSQSParams = exports.generateAddOrderToSQSParams(input, orderId);
    await exports.sendMessageToSQS(addOrderToSQSParams);
    return shared.buildResponse(201, {id: orderId}); 
  } catch (err) {
    console.log(err, err.stack);
    return shared.buildErrorResponse(500, exports.UNHANDLED_ERROR_MESSAGE);
  }
};

exports.generateAddOrderParams = (input, orderId) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: `order#${orderId}`,
      sk: `order#${input.userId}`,
      data: {
        "itemId": input.itemId,
        "orderDate": new Date().toISOString(),
        "quantity": input.quantity,
        "status": "CREATED",
        "userId": input.userId
      },
      "GSI1PK": `user#${input.userId}`,
      "GSI1SK": "order#CREATED",
       "keyParts": {
        "itemId": input.itemId,
        "orderId": orderId,
        "userId":input.userId
       }
    })
  };
  return params;
};

exports.addOrderInDynamo = async (params) => {
  await dynamoClient.send(new PutItemCommand(params));
  return;
};


exports.generateAddOrderToSQSParams = (input, orderId) => {
  const sqsParams = {
    orderId: orderId,
    itemId: input.itemId,
    quantity: input.quantity,
    isPaymentConfirmed: input.isPaymentConfirmed,
    orderDate: new Date().toISOString(),
    userId: input.userId
  };
  return sqsParams;
};

exports.sendMessageToSQS = async (input) => {
  const message = {
    MessageBody: JSON.stringify(input),
    QueueUrl: process.env.ORDER_SQS_URL
  };
  await sqs.send(new SendMessageCommand(message));
};
