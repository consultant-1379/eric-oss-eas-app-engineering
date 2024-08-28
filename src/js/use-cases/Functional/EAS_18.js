import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_ADAPTER_URL, cm_ParamsNoAuth } from '../../utility/constants.js';
import { getcmHandleid } from '../../utility/hash.js';
import { describe } from '../../utility/describe.js';
import { startFrame, endLine } from '../../utility/utility.js';

var targetDnPrefix = 'MeContext=SharedCNF-K6_0001';
const targetNode1 = '';
export default function (subsystemId, data) {
  targetDnPrefix = data.nodessharedcnf[0].node.split(',')[0];
  const cmHandle_id = getcmHandleid(targetDnPrefix, targetNode1);
  startFrame('Starting EAS_TC_018: Get SchemaVersionList for Shared-CNF identified by cmhandles');
  describe('EAS_TC_018: Get SchemaVersionList for Shared-CNF identified by cmhandles', function () {
    const data = {
      operation: 'read',
      dataType: 'application/yang-data+json',
      cmHandleProperties: {
        subSystem: `${subsystemId}`,
        targetDnPrefix: `${targetDnPrefix}`,
        targetNode: `${targetNode1}`,
        neType: 'Shared-CNF',
      },
    };
    let ncmpFlag = true,
      retries = 1,
      TC18_2;
    console.log('Check #1: Get SchemaVersionList for Shared-CNF identified by cmhandles');
    while (ncmpFlag && retries <= 2) {
      TC18_2 = http.post(ENM_ADAPTER_URL + 'dmi/v1/ch/' + `${cmHandle_id}` + '/data/ds/ncmp-datastore:operational?resourceIdentifier=yanglib:modules-state=1&options=(fields=modules-state$$module)', JSON.stringify(data), cm_ParamsNoAuth);
      if (TC18_2.status < 200 || TC18_2.status >= 300) {
        console.log('Error retrying request');
        console.log('Request Body: ' + TC18_2.body);
        console.log('Request Status: ' + TC18_2.status);
        retries++;
        sleep(20);
      } else {
        ncmpFlag = false;
      }
    } //
    const res = check(TC18_2, {
      'Get SchemaVersionList for Shared-CNF identified by cmhandles status is 200': (r) => TC18_2.status === 200,
      'Body is not Empty': (r) => TC18_2.body != [],
    });
    if (!res) {
      console.log(`Status of EAS_TC_18 is ${TC18_2.status}`);
      console.log(`Body EAS_TC_18 is ${TC18_2.body}`);
      errorCounter.add(1);
    }
  });
  endLine('Finished EAS_TC_018');
}
