'use strict';

exports.__esModule = true;
exports.UserConfigReport = undefined;
exports.getProjectType = getProjectType;
exports.prepareWebpackRuleConfig = prepareWebpackRuleConfig;
exports.prepareWebpackStyleConfig = prepareWebpackStyleConfig;
exports.processUserConfig = processUserConfig;
exports.default = getUserConfig;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _figures = require('figures');

var _figures2 = _interopRequireDefault(_figures);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _constants = require('./constants');

var _createWebpackConfig = require('./createWebpackConfig');

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

var _errors = require('./errors');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_REQUIRED = false;

var BABEL_RUNTIME_OPTIONS = new Set(['helpers', 'polyfill']);
var DEFAULT_STYLE_LOADERS = new Set(['css', 'postcss']);

var s = function s(n) {
  var w = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ',s';
  return w.split(',')[n === 1 ? 0 : 1];
};

var UserConfigReport = exports.UserConfigReport = function () {
  function UserConfigReport(configPath) {
    _classCallCheck(this, UserConfigReport);

    this.configPath = configPath;
    this.deprecations = [];
    this.errors = [];
    this.hints = [];
  }

  UserConfigReport.prototype.deprecated = function deprecated(path) {
    for (var _len = arguments.length, messages = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      messages[_key - 1] = arguments[_key];
    }

    this.deprecations.push({ path, messages });
  };

  UserConfigReport.prototype.error = function error(path, value, message) {
    this.errors.push({ path, value, message });
  };

  UserConfigReport.prototype.hasErrors = function hasErrors() {
    return this.errors.length > 0;
  };

  UserConfigReport.prototype.hasSomethingToReport = function hasSomethingToReport() {
    return this.errors.length + this.deprecations.length + this.hints.length > 0;
  };

  UserConfigReport.prototype.hint = function hint(path) {
    for (var _len2 = arguments.length, messages = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      messages[_key2 - 1] = arguments[_key2];
    }

    this.hints.push({ path, messages });
  };

  UserConfigReport.prototype.log = function log() {
    console.log(_chalk2.default.underline(`nwb config report for ${this.configPath}`));
    console.log();
    if (!this.hasSomethingToReport()) {
      console.log(_chalk2.default.green(`${_figures2.default.tick} Nothing to report!`));
      return;
    }

    if (this.errors.length) {
      var count = this.errors.length > 1 ? `${this.errors.length} ` : '';
      console.log(_chalk2.default.red.underline(`${count}Error${s(this.errors.length)}`));
      console.log();
    }
    this.errors.forEach(function (_ref) {
      var path = _ref.path,
          value = _ref.value,
          message = _ref.message;

      console.log(`${_chalk2.default.red(`${_figures2.default.cross} ${path}`)} ${_chalk2.default.cyan('=')} ${_util2.default.inspect(value)}`);
      console.log(`  ${message}`);
      console.log();
    });
    if (this.deprecations.length) {
      var _count = this.deprecations.length > 1 ? `${this.deprecations.length} ` : '';
      console.log(_chalk2.default.yellow.underline(`${_count}Deprecation Warning${s(this.deprecations.length)}`));
      console.log();
    }
    this.deprecations.forEach(function (_ref2) {
      var path = _ref2.path,
          messages = _ref2.messages;

      console.log(_chalk2.default.yellow(`${_figures2.default.warning} ${path}`));
      messages.forEach(function (message) {
        console.log(`  ${message}`);
      });
      console.log();
    });
    if (this.hints.length) {
      var _count2 = this.hints.length > 1 ? `${this.hints.length} ` : '';
      console.log(_chalk2.default.cyan.underline(`${_count2}Hint${s(this.hints.length)}`));
      console.log();
    }
    this.hints.forEach(function (_ref3) {
      var path = _ref3.path,
          messages = _ref3.messages;

      console.log(_chalk2.default.cyan(`${_figures2.default.info} ${path}`));
      messages.forEach(function (message) {
        console.log(`  ${message}`);
      });
      console.log();
    });
  };

  return UserConfigReport;
}();

function checkForRedundantCompatAliases(projectType, aliases, configPath, report) {
  if (!new Set([_constants.INFERNO_APP, _constants.PREACT_APP]).has(projectType)) return;
  if (!aliases) return;

  var compatModule = `${projectType.split('-')[0]}-compat`;
  if (aliases.react && aliases.react.includes(compatModule)) {
    report.hint(`${configPath}.react`, `nwb aliases ${_chalk2.default.yellow('react')} to ${_chalk2.default.green(compatModule)} by default, so you can remove this config.`);
  }
  if (aliases['react-dom'] && aliases['react-dom'].includes(compatModule)) {
    report.hint(`${configPath}.react-dom`, `nwb aliases ${_chalk2.default.yellow('react-dom')} to ${_chalk2.default.green(compatModule)} by default, so you can remove this config.`);
  }
}

/**
 * Load a user config file to get its project type. If we need to check the
 * project type, a config file must exist.
 */
function getProjectType() {
  var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  // Try to load default user config, or use a config file path we were given
  var userConfig = {};
  var userConfigPath = _path2.default.resolve(args.config || _constants.CONFIG_FILE_NAME);

  // Bail early if a config file doesn't exist
  var configFileExists = _fs2.default.existsSync(userConfigPath);
  if (!configFileExists) {
    throw new Error(`Couldn't find a config file at ${userConfigPath} to determine project type.`);
  }

  try {
    userConfig = require(userConfigPath);
    // Delete the file from the require cache as it may be imported multiple
    // times with a different NODE_ENV in place depending on the command.
    delete require.cache[userConfigPath];
  } catch (e) {
    throw new Error(`Couldn't import the config file at ${userConfigPath}: ${e.message}\n${e.stack}`);
  }

  // Config modules can export a function if they need to access the current
  // command or the webpack dependency nwb manages for them.
  if ((0, _utils.typeOf)(userConfig) === 'function') {
    userConfig = userConfig({
      args,
      command: args._[0],
      webpack: _webpack2.default
    });
  }

  var report = new UserConfigReport(userConfigPath);

  if (!_constants.PROJECT_TYPES.has(userConfig.type)) {
    report.error('type', userConfig.type, `Must be one of: ${[].concat(_constants.PROJECT_TYPES).join(', ')}`);
  }
  if (report.hasErrors()) {
    throw new _errors.ConfigValidationError(report);
  }

  return userConfig.type;
}

/**
 * Move loader options into an options object, allowing users to provide flatter
 * config.
 */
function prepareWebpackRuleConfig(rules) {
  Object.keys(rules).forEach(function (ruleId) {
    var rule = rules[ruleId];
    // XXX Special case for stylus-loader, which uses a 'use' option for plugins
    if (rule.use && !/stylus$/.test(ruleId) || rule.options) return;

    var exclude = rule.exclude,
        include = rule.include,
        test = rule.test,
        loader = rule.loader,
        options = _objectWithoutProperties(rule, ['exclude', 'include', 'test', 'loader']);

    if (Object.keys(options).length > 0) {
      rule.options = options;
      Object.keys(options).forEach(function (prop) {
        return delete rule[prop];
      });
    }
  });
}

/**
 * Move loader options into a loaders object, allowing users to provide flatter
 * config.
 */
function prepareWebpackStyleConfig(styles) {
  Object.keys(styles).forEach(function (type) {
    styles[type].forEach(function (styleConfig) {
      var exclude = styleConfig.exclude,
          include = styleConfig.include,
          loaderConfig = _objectWithoutProperties(styleConfig, ['exclude', 'include']);

      if (Object.keys(loaderConfig).length > 0) {
        styleConfig.loaders = {};
        Object.keys(loaderConfig).forEach(function (loader) {
          styleConfig.loaders[loader] = { options: styleConfig[loader] };
          delete styleConfig[loader];
        });
      }
    });
  });
}

// TODO Remove in a future version
var warnedAboutOldStyleRules = false;

/**
 * Validate user config and perform any necessary validation and transformation
 * to it.
 */
function processUserConfig(_ref4) {
  var _ref4$args = _ref4.args,
      args = _ref4$args === undefined ? {} : _ref4$args,
      _ref4$check = _ref4.check,
      check = _ref4$check === undefined ? false : _ref4$check,
      _ref4$pluginConfig = _ref4.pluginConfig,
      pluginConfig = _ref4$pluginConfig === undefined ? {} : _ref4$pluginConfig,
      _ref4$required = _ref4.required,
      required = _ref4$required === undefined ? DEFAULT_REQUIRED : _ref4$required,
      userConfig = _ref4.userConfig,
      userConfigPath = _ref4.userConfigPath;

  // Config modules can export a function if they need to access the current
  // command or the webpack dependency nwb manages for them.
  if ((0, _utils.typeOf)(userConfig) === 'function') {
    userConfig = userConfig({
      args,
      command: args._[0],
      webpack: _webpack2.default
    });
  }

  var report = new UserConfigReport(userConfigPath);

  if ((required || 'type' in userConfig) && !_constants.PROJECT_TYPES.has(userConfig.type)) {
    report.error('type', userConfig.type, `Must be one of: ${[].concat(_constants.PROJECT_TYPES).join(', ')}`);
  }

  var argumentOverrides = {};
  void ['babel', 'devServer', 'karma', 'npm', 'webpack'].forEach(function (prop) {
    // Set defaults for top-level config objects so we don't have to
    // existence-check them everywhere.
    if (!(prop in userConfig)) {
      userConfig[prop] = {};
    }
    // Allow config overrides via --path.to.config in args
    if ((0, _utils.typeOf)(args[prop]) === 'object') {
      argumentOverrides[prop] = args[prop];
    }
  });

  // Make it harder for the user to forget to disable the production debug build
  // if they've enabled it in the config file.
  if (userConfig.webpack.debug) {
    report.hint('webpack.debug', "Don't forget to disable the debug build before building for production");
  }

  if (Object.keys(argumentOverrides).length > 0) {
    (0, _debug2.default)('user config arguments: %s', (0, _utils.deepToString)(argumentOverrides));
    userConfig = (0, _utils.replaceArrayMerge)(userConfig, argumentOverrides);
  }

  // Babel config
  if (!!userConfig.babel.stage || userConfig.babel.stage === 0) {
    if ((0, _utils.typeOf)(userConfig.babel.stage) !== 'number') {
      report.error('babel.stage', userConfig.babel.stage, `Must be a ${_chalk2.default.cyan('Number')} between ${_chalk2.default.cyan('0')} and ${_chalk2.default.cyan('3')}, ` + `or ${_chalk2.default.cyan('false')} to disable use of a stage preset.`);
    } else if (userConfig.babel.stage < 0 || userConfig.babel.stage > 3) {
      report.error('babel.stage', userConfig.babel.stage, `Must be between ${_chalk2.default.cyan(0)} and ${_chalk2.default.cyan(3)}`);
    }
  }
  if (userConfig.babel.presets) {
    if ((0, _utils.typeOf)(userConfig.babel.presets) === 'string') {
      userConfig.babel.presets = [userConfig.babel.presets];
    } else if ((0, _utils.typeOf)(userConfig.babel.presets) !== 'array') {
      report.error('babel.presets', userConfig.babel.presets, `Must be a string or an ${_chalk2.default.cyan('Array')}`);
    }
  }
  if (userConfig.babel.plugins) {
    if ((0, _utils.typeOf)(userConfig.babel.plugins) === 'string') {
      userConfig.babel.plugins = [userConfig.babel.plugins];
    } else if ((0, _utils.typeOf)(userConfig.babel.plugins) !== 'array') {
      report.error('babel.plugins', userConfig.babel.plugins, `Must be a string or an ${_chalk2.default.cyan('Array')}`);
    }
  }
  if ('runtime' in userConfig.babel && (0, _utils.typeOf)(userConfig.babel.runtime) !== 'boolean' && !BABEL_RUNTIME_OPTIONS.has(userConfig.babel.runtime)) {
    report.error('babel.runtime', userConfig.babel.runtime, `Must be ${_chalk2.default.cyan('boolean')}, ${_chalk2.default.cyan("'helpers'")} or ${_chalk2.default.cyan("'polyfill'")})`);
  }

  if ('loose' in userConfig.babel) {
    if ((0, _utils.typeOf)(userConfig.babel.loose) !== 'boolean') {
      report.error('babel.loose', userConfig.babel.loose, `Must be ${_chalk2.default.cyan('boolean')}`);
    } else if (userConfig.babel.loose === true) {
      report.hint('babel.loose', 'Loose mode is enabled by default, so you can remove this config.');
    }
  }

  // Karma config
  // noop

  // npm build config
  if ((0, _utils.typeOf)(userConfig.npm.umd) === 'string') {
    userConfig.npm.umd = { global: userConfig.npm.umd };
  }

  // Webpack config
  if ((0, _utils.typeOf)(userConfig.webpack.autoprefixer) === 'string') {
    userConfig.webpack.autoprefixer = { browsers: userConfig.webpack.autoprefixer };
  }

  if ('copy' in userConfig.webpack) {
    if ((0, _utils.typeOf)(userConfig.webpack.copy) === 'array') {
      userConfig.webpack.copy = { patterns: userConfig.webpack.copy };
    } else if ((0, _utils.typeOf)(userConfig.webpack.copy) === 'object') {
      if (!userConfig.webpack.copy.patterns && !userConfig.webpack.copy.options) {
        report.error('webpack.copy', userConfig.webpack.copy, `Must include ${_chalk2.default.cyan('patterns')} or ${_chalk2.default.cyan('options')} when given as an ${_chalk2.default.cyan('Object')}`);
      }
      if (userConfig.webpack.copy.patterns && (0, _utils.typeOf)(userConfig.webpack.copy.patterns) !== 'array') {
        report.error('webpack.copy.patterns', userConfig.webpack.copy.patterns, `Must be an ${_chalk2.default.cyan('Array')} when provided`);
      }
      if (userConfig.webpack.copy.options && (0, _utils.typeOf)(userConfig.webpack.copy.options) !== 'object') {
        report.error('webpack.copy.options', userConfig.webpack.copy.options, `Must be an ${_chalk2.default.cyan('Object')} when provided.`);
      }
    } else {
      report.error('webpack.copy', userConfig.webpack.copy, `Must be an ${_chalk2.default.cyan('Array')} or an ${_chalk2.default.cyan('Object')}.`);
    }
  }

  if (userConfig.webpack.compat) {
    var compatProps = Object.keys(userConfig.webpack.compat);
    var unknownCompatProps = compatProps.filter(function (prop) {
      return !(prop in _createWebpackConfig.COMPAT_CONFIGS);
    });
    if (unknownCompatProps.length !== 0) {
      report.error('userConfig.webpack.compat', compatProps, `Unknown propert${unknownCompatProps.length === 1 ? 'y' : 'ies'} present.` + `Valid properties are: ${Object.keys(_createWebpackConfig.COMPAT_CONFIGS).join(', ')}.`);
    }

    if (userConfig.webpack.compat.intl) {
      if ((0, _utils.typeOf)(userConfig.webpack.compat.intl.locales) === 'string') {
        userConfig.webpack.compat.intl.locales = [userConfig.webpack.compat.intl.locales];
      } else if ((0, _utils.typeOf)(userConfig.webpack.compat.intl.locales) !== 'array') {
        report.error('webpack.compat.intl.locales', _webpack2.default.compat.intl.locales, 'Must be a string or an Array.');
      }
    }

    if (userConfig.webpack.compat.moment) {
      if ((0, _utils.typeOf)(userConfig.webpack.compat.moment.locales) === 'string') {
        userConfig.webpack.compat.moment.locales = [userConfig.webpack.compat.moment.locales];
      } else if ((0, _utils.typeOf)(userConfig.webpack.compat.moment.locales) !== 'array') {
        report.error('webpack.compat.moment.locales', _webpack2.default.compat.moment.locales, 'Must be a string or an Array.');
      }
    }

    if (userConfig.webpack.compat['react-intl']) {
      if ((0, _utils.typeOf)(userConfig.webpack.compat['react-intl'].locales) === 'string') {
        userConfig.webpack.compat['react-intl'].locales = [userConfig.webpack.compat['react-intl'].locales];
      } else if ((0, _utils.typeOf)(userConfig.webpack.compat['react-intl'].locales) !== 'array') {
        report.error('webpack.compat[\'react-intl\'].locales', _webpack2.default.compat['react-intl'].locales, 'Must be a string or an Array.');
      }
    }
  }

  if (userConfig.webpack.vendorBundle === false) {
    report.error('webpack.vendorBundle', _webpack2.default.vendorBundle, 'No longer supported - add a --no-vendor flag to your build command instead.');
  }

  if ('rules' in userConfig.webpack) {
    if ((0, _utils.typeOf)(userConfig.webpack.rules) !== 'object') {
      report.error('webpack.rules', `type: ${(0, _utils.typeOf)(userConfig.webpack.rules)}`, 'Must be an Object.');
    } else {
      var error = false;
      Object.keys(userConfig.webpack.rules).forEach(function (ruleId) {
        var rule = userConfig.webpack.rules[ruleId];
        if (rule.use && (0, _utils.typeOf)(rule.use) !== 'array') {
          report.error(`webpack.rules.${ruleId}.use`, `type: ${(0, _utils.typeOf)(rule.use)}`, 'Must be an Array.');
          error = true;
        }
      });
      if (!error) {
        prepareWebpackRuleConfig(userConfig.webpack.rules);
      }
    }
  }

  if ('styles' in userConfig.webpack) {
    var configType = (0, _utils.typeOf)(userConfig.webpack.styles);
    if (configType === 'string' && userConfig.webpack.styles !== 'old') {
      report.error('webpack.styles', userConfig.webpack.styles, `Must be ${_chalk2.default.green("'old'")} (to use default style rules from nwb <= v0.15), ${_chalk2.default.green('false')} or an Object.`);
      if (!warnedAboutOldStyleRules) {
        report.deprecated('webpack.styles', 'Support for default style rules from nwb <= v0.15 will be removed in a future release.');
        warnedAboutOldStyleRules = true;
      }
    } else if (configType === 'boolean' && userConfig.webpack.styles !== false) {
      report.error('webpack.styles', userConfig.webpack.styles, `Must be ${_chalk2.default.green("'old'")}, ${_chalk2.default.green('false')} (to disable default style rules) or an Object.`);
    } else if (configType !== 'object' && configType !== 'boolean') {
      report.error('webpack.styles', `type: ${configType}`, `Must be ${_chalk2.default.green("'old'")}, ${_chalk2.default.green('false')} or an Object (to configure custom style rules).`);
    } else {
      var styleTypeIds = ['css'];
      if (pluginConfig.cssPreprocessors) {
        styleTypeIds = styleTypeIds.concat(Object.keys(pluginConfig.cssPreprocessors));
      }
      var _error = false;
      Object.keys(userConfig.webpack.styles).forEach(function (styleType) {
        if (styleTypeIds.indexOf(styleType) === -1) {
          report.error('webpack.styles', `property: ${styleType}`, `Unknown style type - must be ${(0, _utils.joinAnd)(styleTypeIds.map(_chalk2.default.green), 'or')}`);
          _error = true;
        } else if ((0, _utils.typeOf)(userConfig.webpack.styles[styleType]) !== 'array') {
          report.error(`webpack.styles.${styleType}`, `type: ${(0, _utils.typeOf)(userConfig.webpack.styles[styleType])}`, `Must be an Array - if you don't need multiple custom rules, configure the defaults via ${_chalk2.default.green('webpack.rules')} instead.`);
          _error = true;
        } else {
          userConfig.webpack.styles[styleType].forEach(function (styleConfig, index) {
            var test = styleConfig.test,
                include = styleConfig.include,
                exclude = styleConfig.exclude,
                loaderConfig = _objectWithoutProperties(styleConfig, ['test', 'include', 'exclude']);

            Object.keys(loaderConfig).forEach(function (loaderId) {
              if (!DEFAULT_STYLE_LOADERS.has(loaderId) && loaderId !== styleType) {
                // XXX Assumption: preprocessors provide a single loader which
                //     is configured with the same id as the style type id.
                // XXX Using Array.from() manually as babel-preset-env with a
                //     Node 4 target is tranpiling Array spreads to concat()
                //     calls without ensuring Sets are converted to Arrays.
                var loaderIds = Array.from(new Set([].concat(Array.from(DEFAULT_STYLE_LOADERS), [styleType]))).map(function (id) {
                  return _chalk2.default.green(id);
                });
                report.error(`webpack.styles.${styleType}[${index}]`, `property: ${loaderId}`, `Must be ${_chalk2.default.green('include')}, ${_chalk2.default.green('exclude')} or a loader id: ${(0, _utils.joinAnd)(loaderIds, 'or')}`);
                _error = true;
              }
            });
          });
        }
      });
      if (!_error) {
        prepareWebpackStyleConfig(userConfig.webpack.styles, pluginConfig);
      }
    }
  }

  checkForRedundantCompatAliases(userConfig.type, userConfig.webpack.aliases, 'webpack.aliases', report);

  if (userConfig.webpack.extra) {
    if (userConfig.webpack.extra.output && userConfig.webpack.extra.output.publicPath) {
      report.hint('webpack.extra.output.publicPath', `You can use the more convenient ${_chalk2.default.green('webpack.publicPath')} instead.`);
    }
    if (userConfig.webpack.extra.resolve && userConfig.webpack.extra.resolve.alias) {
      report.hint('webpack.extra.resolve.alias', `You can use the more convenient ${_chalk2.default.green('webpack.aliases')} instead.`);
      checkForRedundantCompatAliases(userConfig.type, userConfig.webpack.extra.resolve.alias, 'webpack.extra.resolve.alias', report);
    }
  }

  if ('config' in userConfig.webpack && (0, _utils.typeOf)(userConfig.webpack.config) !== 'function') {
    report.error(`webpack.config`, `type: ${(0, _utils.typeOf)(userConfig.webpack.config)}`, 'Must be a Function.');
  }

  if (report.hasErrors()) {
    throw new _errors.ConfigValidationError(report);
  }
  if (check) {
    throw report;
  }
  if (report.hasSomethingToReport()) {
    report.log();
  }

  (0, _debug2.default)('user config: %s', (0, _utils.deepToString)(userConfig));

  return userConfig;
}

/**
 * Load a user config file and process it.
 */
function getUserConfig() {
  var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _options$check = options.check,
      check = _options$check === undefined ? false : _options$check,
      _options$pluginConfig = options.pluginConfig,
      pluginConfig = _options$pluginConfig === undefined ? {} : _options$pluginConfig,
      _options$required = options.required,
      required = _options$required === undefined ? DEFAULT_REQUIRED : _options$required;
  // Try to load default user config, or use a config file path we were given

  var userConfig = {};
  var userConfigPath = _path2.default.resolve(args.config || _constants.CONFIG_FILE_NAME);

  // Bail early if a config file is required and doesn't exist
  var configFileExists = _fs2.default.existsSync(userConfigPath);
  if ((args.config || required) && !configFileExists) {
    throw new Error(`Couldn't find a config file at ${userConfigPath}`);
  }

  // If a config file exists, it should be a valid module regardless of whether
  // or not it's required.
  if (configFileExists) {
    try {
      userConfig = require(userConfigPath);
      (0, _debug2.default)('imported config module from %s', userConfigPath);
      // Delete the file from the require cache as some builds need to import
      // it multiple times with a different NODE_ENV in place.
      delete require.cache[userConfigPath];
    } catch (e) {
      throw new Error(`Couldn't import the config file at ${userConfigPath}: ${e.message}\n${e.stack}`);
    }
  }

  userConfig = processUserConfig({ args, check, pluginConfig, required, userConfig, userConfigPath });

  if (configFileExists) {
    userConfig.path = userConfigPath;
  }

  return userConfig;
}