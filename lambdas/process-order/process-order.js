
const EventBridge = require('aws-sdk/clients/eventbridge');
const eventBridge = new EventBridge();

const requireWithFallback = require('node-require-fallback');
const shared = requireWithFallback('/opt/nodejs/serverless-poc-shared', '../../dependencies/serverless-poc-shared');

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong.';

exports.sqsHandler = async (event) => {
  try {
    console.log('Event: ', JSON.stringify(event));
    await Promise.all(event.Records.map (async (record) => {
      await exports.publishEventBridgeEvent(JSON.parse(record.body));
    }));
    return shared.buildResponse(200, { message: 'OK' }); 
  } catch (err) {
    console.log(err, err.stack);
    return shared.buildErrorResponse(500, exports.UNHANDLED_ERROR_MESSAGE);
  }
};

exports.publishEventBridgeEvent = async (body) => {
  const orders = [];
  orders.push({
    Source: 'process-orders',
    DetailType: 'order-placed',
    Detail: JSON.stringify(body)
  });
  await eventBridge.putEvents({ Entries: orders }).promise();
};
