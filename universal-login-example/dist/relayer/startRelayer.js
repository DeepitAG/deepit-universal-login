'use strict';

var _relayer = require('@universal-login/relayer');

var config = require('./config');

var relayer = new _relayer.TokenGrantingRelayer(config);
relayer.start().catch(console.error);