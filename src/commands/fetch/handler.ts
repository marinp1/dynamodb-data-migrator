import {Arguments} from 'yargs';
import procedures from '../../procedures';
import tableOperations from '../../operations';
import {loadConfigFromFile} from '../../config';
import {FetchArguments} from '../../types';

export default (argv: Arguments<FetchArguments>) => {
  return loadConfigFromFile(argv['config-file'], {skipTarget: true}).then(
    config =>
      tableOperations(config).then(operations =>
        procedures.migrateAndTransform(
          operations,
          {
            source: {region: 'source', tableName: config.source.tableName},
            target: {
              region: 'local',
              tableName: config.localConfig.sourceTableName,
            },
          },
          {
            dryrun: argv['dry-run'],
            limit: argv.limit === -1 ? undefined : argv.limit,
            truncate: argv.truncate,
            throttle: argv.throttle,
          }
        )
      )
  );
};
