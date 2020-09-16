import {Arguments} from 'yargs';
import procedures from '../../procedures';
import tableOperations from '../../operations';
import {loadConfigFromFile} from '../../config';
import {TransformArguments} from '../../types';

export default (argv: Arguments<TransformArguments>) => {
  return loadConfigFromFile(argv['config-file'], {skipTarget: true}).then(
    config =>
      tableOperations(config).then(operations =>
        procedures.migrateAndTransform(
          operations,
          {
            source: {
              region: 'local',
              tableName: config.localConfig.sourceTableName,
            },
            target: {
              region: 'local',
              tableName: config.localConfig.targetTableName,
            },
            tranformFunction: c => c,
          },
          {
            truncate: argv.truncate,
            dryrun: argv['dry-run'],
          }
        )
      )
  );
};
