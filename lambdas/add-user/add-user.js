const { DynamoDBClient, PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const dynamoClient = new DynamoDBClient();
const ULID = require('ulid');

const requireWithFallback = require('node-require-fallback');
const shared = requireWithFallback('/opt/nodejs/serverless-poc-shared', '../../dependencies/serverless-poc-shared');

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong.';
exports.USER_ALREADY_EXISTS = 'User Already exists';

exports.lambdaHandler = async (event) => {
  try {
    console.log('Event: ', JSON.stringify(event));
    const input = JSON.parse(event.body);
    console.log('Event: ', input);
    const getUserParams = exports.buildGetUserParams(input.email);
    const userResponse = await exports.getUserFromDynamo(getUserParams);
    if (userResponse.Items && userResponse.Items.length) {
      return shared.buildErrorResponse(400, exports.USER_ALREADY_EXISTS);
    }
    const addUserParams = exports.generateAddUserParams(input);
    await exports.addUserInDynamo(addUserParams);
    return shared.buildResponse(200, {result: 'OK'}); 
  } catch (err) {
    console.log(err, err.stack);
    return shared.buildErrorResponse(500, exports.UNHANDLED_ERROR_MESSAGE);
  }
};

exports.getUserFromDynamo = async (params) => {
  const response = await dynamoClient.send(new QueryCommand(params));
  return response;
};

exports.buildGetUserParams = (email) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    IndexName: process.env.GSI1_NAME,
    KeyConditionExpression: '#gsi1pk = :gsi1pk and #gsi1sk = :gsi1sk',
    ExpressionAttributeNames: {
      '#gsi1pk': 'GSI1PK',
      '#gsi1sk': 'GSI1SK'
    },
    ExpressionAttributeValues: marshall({
      ':gsi1pk': `user#${email}`,
      ':gsi1sk': 'user#'
    })
  };
  return params;
};

exports.generateAddUserParams = (input) => {
  const id = ULID.ulid();
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: `user#${id}`,
      sk: 'user#',
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        mobileNo: input.mobileNo,
        address: input.address
      },
      keyParts: {
        userId: id,
        email: input.email
      },
      GSI1PK: `user#${input.email}`,
      GSI1SK: 'user#'
    })
  };
  return params;
};

exports.addUserInDynamo = async (params) => {
  await dynamoClient.send(new PutItemCommand(params));
  return;
};
