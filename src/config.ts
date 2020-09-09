import yargs from 'yargs';

const argv = yargs
  .usage('$0 -operand1 number -operand2 number -operation [add|subtract]')
  .option('source-profile', {
    description: 'AWS profile to use for source table, set empty for localhost',
    alias: 'SP',
    default: 'localhost',
    type: 'string',
  })
  .option('source-region', {
    description: 'AWS region to use for source table, set empty for localhost',
    alias: 'SR',
    default: 'localhost',
    type: 'string',
  })
  .option('source-table', {
    description: 'name of source table to fetch data from',
    alias: 'ST',
    required: true,
    type: 'string',
  })
  .option('target-profile', {
    description: 'AWS profile to use for target table, set empty for localhost',
    alias: 'TP',
    default: 'localhost',
    type: 'string',
  })
  .option('target-region', {
    description: 'AWS region to use for target table, set empty for localhost',
    alias: 'TR',
    default: 'localhost',
    type: 'string',
  })
  .option('target-table', {
    description: 'name of target table to send data to',
    alias: 'TT',
    required: true,
    type: 'string',
  })
  .option('mode', {
    description: 'fetch from source or put to target',
    alias: 'M',
    choices: ['fetch', 'put'],
    required: true,
    type: 'string',
  })
  .option('no-dry-run', {
    description: 'run operation',
    default: false,
    type: 'boolean',
  })
  .option('temporary-table-name', {
    describe: 'default name for temporary table used for migration',
    default: 'dynamodb-migrator-temporary-table',
    type: 'string',
  })
  .option('local-dynamodb-url', {
    describe: 'dynamob url used for local migration',
    default: 'http://localhost:8000',
    type: 'string',
  })
  .demandOption(
    ['mode', 'source-table', 'target-table'],
    'Please provide at least mode, source-table and target-table arguments'
  )
  .help()
  .alias('help', 'h').argv;

export default {
  mode: argv.mode.toUpperCase() as 'FETCH' | 'PUT',
  dryRun: !argv['no-dry-run'],
  source: {
    table: argv['source-table'],
    profile: argv['source-profile'],
    region: argv['source-region'],
  },
  target: {
    table: argv['target-table'],
    profile: argv['target-profile'],
    region: argv['target-region'],
  },
  localConfig: {
    temporaryTableName: argv['temporary-table-name'],
    localDynamoDbUrl: argv['local-dynamodb-url'],
  },
};
