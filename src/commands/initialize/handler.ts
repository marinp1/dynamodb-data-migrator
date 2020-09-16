import {Arguments} from 'yargs';
import procedures from '../../procedures';
import tableOperations from '../../operations';
import {saveConfigToFile} from '../../config';
import {Config, InitialiseArguments} from '../../types';

export default (argv: Arguments<InitialiseArguments>) => {
  const config: Config = {
    source: {
      profile: argv['source-profile'],
      region: argv['source-region'],
      tableName: argv['source-table'],
    },
    target: argv['target-table']
      ? {
          profile: argv['target-profile'],
          region: argv['target-region'],
          tableName: argv['target-table'],
        }
      : null,
    localConfig: {
      endpoint: argv['local-dynamodb-endpoint'],
      sourceTableName: argv['local-source-tablename'],
      targetTableName: argv['local-target-tablename'],
    },
  };
  const useSourceSchemaAsTarget = !!argv['use-source-schema'];
  const createTargetSchema = useSourceSchemaAsTarget || config.target !== null;

  return tableOperations(config)
    .then(operations =>
      procedures
        .deleteAndCreate(operations, {
          source: {
            region: 'source',
            tableName: config.source.tableName,
          },
          target: {
            region: 'local',
            tableName: config.localConfig.sourceTableName,
          },
        })
        .then(() =>
          createTargetSchema
            ? procedures.deleteAndCreate(operations, {
                source: useSourceSchemaAsTarget
                  ? {
                      region: 'source',
                      tableName: config.source.tableName,
                    }
                  : {
                      region: 'target',
                      tableName: config.target!.tableName,
                    },
                target: {
                  region: 'local',
                  tableName: config.localConfig.targetTableName,
                },
              })
            : Promise.resolve()
        )
    )
    .then(() => saveConfigToFile(config));
};
