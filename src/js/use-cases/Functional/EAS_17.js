import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_ADAPTER_URL, cm_ParamsNoAuth } from '../../utility/constants.js';
import { describe } from '../../utility/describe.js';
import { startFrame, endLine } from '../../utility/utility.js';

export default function (subsystemId) {
  startFrame('Starting EAS_TC_017: Get nodeModelIdentity list for Shared-CNFs');
  describe('EAS_TC_017: Get nodeModelIdentity list for Shared-CNFs', function () {
    // Requested empty md5hash
    const cmHandleId = '9C591B0DC6E617C311F8685350B9F46C';
    const data = {
      operation: 'read',
      dataType: 'application/yang-data+json',
      cmHandleProperties: {
        subSystem: `${subsystemId}`,
      },
    };
    let ncmpFlag = true,
      retries = 1,
      TC17_2;
    console.log('Check #1: Get nodeModelIdentity list for Shared-CNFs');
    while (ncmpFlag && retries <= 5) {
      TC17_2 = http.post(ENM_ADAPTER_URL + 'dmi/v1/ch/' + `${cmHandleId}` + '/data/ds/ncmp-datastore:passthrough-operational?options=(fields=NetworkElement/attributes(nodeModelIdentity),scope=NetworkElement/attributes(neType=Shared-CNF))', JSON.stringify(data), cm_ParamsNoAuth);
      if (TC17_2.status < 200 || TC17_2.status >= 300) {
        console.log('Check #1: Error retrying request');
        console.log('Check #1: Request Body: ' + TC17_2.body);
        retries++;
        sleep(20);
      } else {
        ncmpFlag = false;
      }
    } //
    const res = check(TC17_2, {
      'Get nodeModelIdentity list for Shared-CNFs is 200': (r) => TC17_2.status === 200,
      'Body is not Empty': (r) => TC17_2.body != [],
    });
    if (!res) {
      console.log(`Status of EAS_TC_017 is ${TC17_2.status}`);
      console.log(`Body EAS_TC_017 is ${TC17_2.body}`);
      errorCounter.add(1);
    }
  });
  endLine('Finished EAS_TC_017');
}
