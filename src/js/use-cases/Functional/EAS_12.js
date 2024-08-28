import http from 'k6/http';
import { check } from 'k6';
import { errorCounter } from '../../main.js';
import { OUTSIDE_API_GW_URL, OUTSIDE_API_GW_TLS_URL, SEF_URL } from '../../utility/constants.js';
import { startFrame, endLine } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';

const sys_user = __ENV.SYS_USER || 'cerberus';
const sys_pwd = __ENV.SYS_PASSWORD || 'SuperSecret123!';
var index_ncmp;
var index_rta;
var URI = OUTSIDE_API_GW_TLS_URL;

export default function () {
  startFrame('Starting EAS_TC_012: Verify that NCMP and RTA route is present in API GW');
  describe('EAS_TC_012: Verify that NCMP and RTA route is present in API GW', function () {
    const head = {
      headers: {
        'X-Login': `${sys_user}`,
        'X-password': `${sys_pwd}`,
        'X-tenant': 'master',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    console.log('Check #1: GAS authentication');
    let TC12_1 = http.post(URI + 'auth/v1/login', {}, head);
    console.log(`Body TC12_1_1 is ${TC12_1.body}`);
    if (TC12_1.status != 200) {
      URI = OUTSIDE_API_GW_URL;
      TC12_1 = http.post(URI + 'auth/v1/login', {}, head);
      console.log(`Body TC12_1_2 is ${TC12_1.body}`);
    }
    const res1 = check(TC12_1, {
      'Change login session to gas status -> Status is 200': (r) => TC12_1.status === 200,
      'Body is Not empty ': (r) => TC12_1.body != [],
    });
    if (!res1) {
      console.log('TC12_1 cookie session id: ' + TC12_1.body);
      errorCounter.add(1);
    }
    let sessionId = TC12_1.body;
    const head2 = {
      headers: {
        'content-type': `application/json`,
        Cookie: `JSESSIONID=${sessionId}`,
      },
    };

    console.log('Check #2: GET routes from GAS');
    let TC12_2 = http.get(URI + 'v1/routes', head2);
    let json = JSON.parse(TC12_2.body);
    let isNCMPuri = false,
      isNCMPgk = false,
      isRTAuri = false,
      isRTAgk = false;

    let index_ncmp = -1;
    let index_rta = -1;

    if (json.length) {
      for (let i = 0; i < json.length; i++) {
        let obj = json[i];
        if (obj.id.includes('eric-oss-ncmp')) {
          index_ncmp = i;
        }
        if (obj.id.includes('eric-oss-ran-topology-adapter')) {
          index_rta = i;
        }
      }
    }

    if (index_ncmp > -1) {
      let ncmpPredicates = JSON.parse(TC12_2.body)[index_ncmp].predicates[0].args._genkey_0;
      isNCMPuri = JSON.parse(TC12_2.body)[index_ncmp].uri === 'http://eric-oss-ncmp:8080';
      isNCMPgk = ncmpPredicates === '/ncmp/**' || ncmpPredicates === '/ncmp/*/ch/**';
    }

    if (index_rta > -1) {
      console.log('index_rta :>> ', index_rta);
      console.log('JSON.parse(TC12_2.body)[index_rta].uri :>> ', JSON.parse(TC12_2.body)[index_rta].uri);
      console.log('JSON.parse(TC12_2.body)[index_rta].predicates[0].args._genkey_0 :>> ', JSON.parse(TC12_2.body)[index_rta].predicates[0].args._genkey_0);
      isRTAuri = JSON.parse(TC12_2.body)[index_rta].uri == 'http://eric-oss-ran-topology-adapter:8080' ? true : false;
      isRTAgk = JSON.parse(TC12_2.body)[index_rta].predicates[0].args._genkey_0 == '/eric-oss-ran-topology-adapter/**' ? true : false;
      console.log('isRTAuri :>> ', isRTAuri);
      console.log('isRTAgk :>> ', isRTAgk);
    }

    console.log('Check #3: Verify response contains: route for ncmp and ran topology adapter');
    const res2 = check(TC12_2, {
      'Get route status is 200': (r) => TC12_2.status === 200,
      'There is ncmp uri entry in the body': (r) => isNCMPuri === true,
      'There is ncmp genkey entry in the body ': (r) => isNCMPgk === true,
      'There is rta uri entry in the body': (r) => isRTAuri === true,
      'There is rta genkey entry in the body ': (r) => isRTAgk === true,
    });
    if (!res2) {
      console.log('TC12_2 status: ' + TC12_2.status);
      TC12_2.body && console.log('TC12_2 body: ' + TC12_2.body);
      errorCounter.add(1);
    }
  });
  describe('EAS_TC_012: Verify that NCMP route is present in SEF', function () {
    let getRoute = http.get(`${SEF_URL}admin/v3/apis/network-configuration/endpoints`);
    const res = check(getRoute, {
      'Get route from sef status is 200: ': getRoute.status == 200,
      'There is ncmp uri entry in the body': getRoute.body.includes('eric-oss-ncmp:8080'),
    });
    if (!res) {
      console.log('Get route from SEF status: ' + getRoute.status);
      getRoute.body && console.log('Get route from SEF body: ' + getRoute.body);
      errorCounter.add(1);
    }
  });
  endLine('Finished EAS_TC_012');
}
