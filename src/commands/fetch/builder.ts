import {Argv} from 'yargs';
import {FetchArguments} from '../../types';

export default (args: Argv<{}>): Argv<FetchArguments> =>
  args
    .option('config-file', {
      description: 'configuration file to use for fetching',
      required: true,
      type: 'string',
    })
    .option('dry-run', {
      description: 'run operation',
      default: true,
      type: 'boolean',
    })
    .option('truncate', {
      description: 'empty destination table during import',
      default: false,
      type: 'boolean',
    })
    .option('limit', {
      description: 'the max number to import (soft limit)',
      default: -1,
      type: 'number',
    })
    .option('throttle', {
      description: 'number of milliseconds to wait before each segment',
      default: 0,
      type: 'number',
    })
    .demandOption('config-file', 'path to configuration file is required');
