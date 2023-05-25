'use strict';

const app = require('../add-order');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Add Order tests', () => {


  afterEach(() => {
    sinon.restore();
  });

  before(() => {
    process.env.TABLE_NAME = 'order_data';
  });

  after(() => {
    delete process.env.TABLE_NAME;
  });
});

