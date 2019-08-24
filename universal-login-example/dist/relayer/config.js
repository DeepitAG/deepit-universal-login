'use strict';

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _relayer = require('@universal-login/relayer');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = Object.freeze((0, _extends3.default)({}, (0, _relayer.getConfig)('production'), {
  tokenContractAddress: process.env.TOKEN_CONTRACT_ADDRESS,
  clickerContractAddress: process.env.CLICKER_CONTRACT_ADDRESS
}));