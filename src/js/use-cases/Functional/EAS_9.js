import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_ADAPTER_URL, cm_ParamsNoAuth } from '../../utility/constants.js';
import { getcmHandleid } from '../../utility/hash.js';
import { describe } from '../../utility/describe.js';
import { startFrame, endLine } from '../../utility/utility.js';

const targetDnPrefix = 'MeContext=RadioNode-K6_0001';
const targetNode = 'ManagedElement=RadioNode-K6_0001';

export default function (subsystemId) {
  const cmHandle_id = getcmHandleid(targetDnPrefix, targetNode);
  startFrame('Starting EAS_TC_009: Get SchemaVersionList for RadioNode identified by cmhandles');
  describe('EAS_TC_009: Get SchemaVersionList for RadioNode identified by cmhandles', function () {
    const data = {
      operation: 'read',
      dataType: 'application/yang-data+json',
      cmHandleProperties: {
        subSystem: `${subsystemId}`,
        targetDnPrefix: `${targetDnPrefix}`,
        targetNode: `${targetNode}`,
        neType: 'RadioNode',
      },
    };
    let ncmpFlag = true,
      retries = 1,
      TC9_2;
    console.log('Check #1: Get SchemaVersionList for RadioNode identified by cmhandles');
    while (ncmpFlag && retries <= 5) {
      TC9_2 = http.post(ENM_ADAPTER_URL + 'dmi/v1/ch/' + `${cmHandle_id}` + '/data/ds/ncmp-datastore:operational?resourceIdentifier=ericsson-enm-comtop:SystemFunctions=1/ericsson-enm-comtop:SysM=1&options=(fields=Schema/attributes(*))', JSON.stringify(data), cm_ParamsNoAuth);
      if (TC9_2.status < 200 || TC9_2.status >= 300) {
        console.log('Error retrying request');
        console.log('Request Body: ' + TC9_2.body);
        retries++;
        sleep(20);
      } else {
        ncmpFlag = false;
      }
    } //
    const res = check(TC9_2, {
      'Get SchemaVersionList for RadioNode identified by cmhandles status is 200': (r) => TC9_2.status === 200,
      'Body is not Empty': (r) => TC9_2.body != [],
    });
    if (!res) {
      console.log(`Status of EAS_TC_9 is ${TC9_2.status}`);
      console.log(`Body EAS_TC_9 is ${TC9_2.body}`);
      errorCounter.add(1);
    }
  });
  endLine('Finished EAS_TC_009');
}
