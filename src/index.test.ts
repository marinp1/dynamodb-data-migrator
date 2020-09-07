jest.mock('./operations');
jest.mock('./utils');

import * as operations from './operations';
import * as utils from './utils';

const mockedOperations = operations as jest.Mocked<typeof operations>;
const mockedUtils = utils as jest.Mocked<typeof utils>;

describe('Main loop', () => {
  beforeAll(() => {
    mockedOperations.deleteTemporaryTable.mockResolvedValue();
    mockedOperations.describeSourceTable.mockResolvedValue({});
    mockedOperations.createTemporaryTable.mockResolvedValue();
    mockedUtils.convertDescriptionToInput.mockImplementation(() => ({
      AttributeDefinitions: [],
      TableName: 'MOCKED_TABLE_NAME',
      KeySchema: [
        {
          AttributeName: 'MAIN_COLUMN',
          KeyType: 'HASH',
        },
      ],
      LocalSecondaryIndexes: [],
      GlobalSecondaryIndexes: [],
      ProvisionedThroughput: {
        ReadCapacityUnits: 40000,
        WriteCapacityUnits: 40000,
      },
    }));
  });
});
