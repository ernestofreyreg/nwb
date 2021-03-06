'use strict';

exports.__esModule = true;
exports.default = buildDemo;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _runSeries = require('run-series');

var _runSeries2 = _interopRequireDefault(_runSeries);

var _utils = require('../utils');

var _webpackBuild = require('../webpackBuild');

var _webpackBuild2 = _interopRequireDefault(_webpackBuild);

var _cleanDemo = require('./clean-demo');

var _cleanDemo2 = _interopRequireDefault(_cleanDemo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getCommandConfig(args) {
  var pkg = require(_path2.default.resolve('package.json'));

  var dist = _path2.default.resolve('demo/dist');
  var production = process.env.NODE_ENV === 'production';
  var filenamePattern = production ? '[name].[chunkhash:8].js' : '[name].js';

  var config = {
    babel: {
      presets: [require.resolve('babel-preset-react')],
      stage: 1
    },
    devtool: 'source-map',
    entry: {
      demo: [_path2.default.resolve('demo/src/index.js')]
    },
    output: {
      filename: filenamePattern,
      chunkFilename: filenamePattern,
      path: dist
    },
    plugins: {
      html: {
        mountId: 'demo',
        title: args.title || `${pkg.name} ${pkg.version} Demo`
      },
      // A vendor bundle can be explicitly enabled with a --vendor flag
      vendor: args.vendor
    }
  };

  if ((0, _utils.directoryExists)('demo/public')) {
    config.plugins.copy = [{ from: _path2.default.resolve('demo/public'), to: dist }];
  }

  return config;
}

/**
 * Build a module's demo app from demo/src/index.js.
 */
function buildDemo(args, cb) {
  (0, _runSeries2.default)([function (cb) {
    return (0, _cleanDemo2.default)(args, cb);
  }, function (cb) {
    return (0, _webpackBuild2.default)('demo', args, getCommandConfig, cb);
  }], cb);
}
module.exports = exports['default'];