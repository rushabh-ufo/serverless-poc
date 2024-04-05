const { StatusCodes } = require('http-status-codes');

exports.buildResponse = (statusCode, body) => {
  return {
    'statusCode': statusCode,
    'body': JSON.stringify(body),
    'headers': { 'Access-Control-Allow-Origin': '*' }
  };
};

exports.buildErrorResponse = (statusCode, message) => {
  return exports.buildResponse(statusCode, { message: message });
};

exports.buildIdResponse = (id) => {
  return exports.buildResponse(StatusCodes.CREATED, { id: id });
};