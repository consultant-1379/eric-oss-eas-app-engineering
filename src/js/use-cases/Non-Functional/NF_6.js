import http from 'k6/http';
import { check, group } from 'k6';
import { errorCounter } from './easTests.js';
import { NCMP_URL, cm_Params, cmHandlecount } from './constants.js';
import { describe } from './describe.js';

export function NF_6() {
  describe('NF_TC_006: NCMP and ENM Model Adapter automatic scale out', function () {
    console.log(' --------------------------------------------------');
    console.log('|               Start NF_TC_006                    |');
    console.log(' --------------------------------------------------');
    const query = JSON.stringify({
      conditions: [
        {
          name: 'hasAllModules',
          conditionParameters: [
            {
              moduleName: 'ericsson-enm-RcsBrM',
            },
          ],
        },
      ],
    });

    let startTime = Date.now(),
      timeTaken = 0;
    const queryResult = http.post(`${NCMP_URL}ncmp/v1/ch/searches`, query, cm_Params);
    timeTaken = (Date.now() - startTime) / 1000;
    var responseBody = JSON.parse(queryResult.body);
    if (responseBody.length || responseBody.length == 0) {
      console.info('New version of searches endpoint');
    } else {
      console.info('Old version of searches endpoint');
      responseBody = responseBody.cmHandles;
    }
    console.log('Elapsed seconds: ' + timeTaken);
    const res = check(queryResult, {
      ['Queried ' + cmHandlecount + ' RadioNodes returned']: () => responseBody.length === cmHandlecount,
      'Overall time taken is less than TBD': () => timeTaken >= 0,
    });
    if (!res) {
      console.log('Status of queryResult: ' + queryResult.status);
      console.log('Body of queryResult: ' + queryResult.body);
      console.log('Length of queryResult: ' + responseBody.length);
      errorCounter.add(1);
    }
    console.log(' --------------------------------------------------');
    console.log('|                End of NF_TC_006                  |');
    console.log(' --------------------------------------------------');
  });
}
