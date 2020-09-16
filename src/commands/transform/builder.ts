import {Argv} from 'yargs';
import {TransformArguments} from '../../types';

export default (args: Argv<{}>): Argv<TransformArguments> =>
  args
    .option('config-file', {
      description: 'configuration file to use for fetching',
      required: true,
      type: 'string',
    })
    /*
    .option('transform-file', {
      description: 'file to use for transformation',
      required: true,
      type: 'string',
    })
    */
    .option('dry-run', {
      description: 'run transformation',
      default: true,
      type: 'boolean',
    })
    .option('truncate', {
      description: 'empty destination table during import',
      default: false,
      type: 'boolean',
    })
    .demandOption('config-file', 'path to config file is required');
// .demandOption('transform-file', 'path to transform file is required');
