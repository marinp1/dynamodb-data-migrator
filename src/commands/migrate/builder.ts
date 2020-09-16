import {Argv} from 'yargs';
import {MigrationArguments} from '../../types';

export default (args: Argv<{}>): Argv<MigrationArguments> =>
  args
    .option('config-file', {
      description: 'configuration file to use',
      required: true,
      type: 'string',
    })
    .option('dry-run', {
      description: 'run operation',
      default: true,
      type: 'boolean',
    })
    .option('create-table', {
      describe: 'should target table be created during migration',
      default: false,
      type: 'boolean',
    })
    .option('throttle', {
      description: 'number of milliseconds to wait before each segment',
      default: 0,
      type: 'number',
    })
    .demandOption('config-file', 'path to configuration file is required');
