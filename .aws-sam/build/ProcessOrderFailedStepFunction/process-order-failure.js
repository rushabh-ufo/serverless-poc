const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const dynamoClient = new DynamoDBClient();

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong.';

exports.stepFunctionHandler = async (state, context, callback) => {
  try {
    console.log('State : ', state);
    const orderParams = exports.generateAddOrderParams(state);
    await exports.addOrderInDynamo(orderParams);
    return state;
  } catch (err) {
    console.log("Error: ", JSON.stringify(err));
    console.log("Error stack: ", JSON.stringify(err.stack));
    console.log(err, err.stack);
    callback(err);
  }
};


exports.generateAddOrderParams = (input) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: `order#${input.orderId}`,
      sk: `order#${input.userId}`,
      data: {
        "itemId": input.itemId,
        "orderDate": input.orderDate,
        "quantity": input.quantity,
        "status": "REJECTED",
        "userId": input.userId
      },
      "GSI1PK": `user#${input.userId}`,
      "GSI1SK": "order#REJECTED",
       "keyParts": {
        "itemId": input.itemId,
        "orderId": input.orderId,
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
