import fs from 'fs';
import yaml from 'js-yaml';
import {Config} from './types';

export const saveConfigToFile = async (config: Config) => {
  const configAsYaml = yaml.safeDump(config);
  const fileName = `ddm.${config.source.tableName}.yml`;
  return fs.writeFile(fileName, configAsYaml, 'utf8', err => {
    if (err) {
      console.error(err);
      throw new Error('Failed to write configuration');
    }
    console.log(
      'Configuration save as',
      fileName,
      'to current directory, use that with --config command to preload configuration for next steps'
    );
  });
};

const isValidAWSConfig = (type: 'source' | 'target', asConfig: Config) =>
  !!(
    asConfig[type] &&
    asConfig[type]?.profile &&
    asConfig[type]?.region &&
    asConfig[type]?.tableName
  );

export const loadConfigFromFile = (
  configPath: string,
  options: {skipTarget: boolean} = {
    skipTarget: false,
  }
): Promise<Config> => {
  return new Promise((resolve, reject) =>
    fs.readFile(configPath, {encoding: 'utf8'}, (err, data) => {
      if (err) {
        console.error(err);
        return reject(new Error('Failed to read configuration file'));
      }

      const config = yaml.safeLoad(data);

      if (config === undefined || typeof config === 'string') {
        return reject(
          new Error('Failed to parse configuration file, please check path')
        );
      }

      const asConfig = config as Config;

      if (!isValidAWSConfig('source', asConfig)) {
        return reject(
          new Error('Failed to parse AWS configuration for source')
        );
      }

      if (!options.skipTarget) {
        if (!isValidAWSConfig('target', asConfig)) {
          return reject(
            new Error('Failed to parse AWS configuration for target')
          );
        }
      }

      if (
        !(
          asConfig.localConfig &&
          asConfig.localConfig.endpoint &&
          asConfig.localConfig.sourceTableName &&
          asConfig.localConfig.targetTableName
        )
      ) {
        return reject(new Error('Failed to parse local configuration'));
      }

      return resolve(asConfig);
    })
  );
};
