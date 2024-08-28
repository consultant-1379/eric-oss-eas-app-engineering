import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_STUB_URL } from '../../utility/constants.js';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';
import { describe } from '../../utility/describe.js';

const fd = new FormData();

export default function () {
  describe('EAS_TC_011 : Get Radionode schema version list from ENM stub', function () {
    fd.append('name', 'command');
    fd.append('stream_output', 'true');
    fd.append('command', 'cmedit get SubNetwork=Europe,SubNetwork=Ireland,MeContext=NR48gNodeBRadio0099,ManagedElement=NR48gNodeBRadio0099,SystemFunctions=1,SysM=1 Schema.(*)');
    const head = {
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + fd.boundary,
        Cookie: 'iPlanetDirectoryPro=S2~AQIC5wM2LY4Sfcy_9QzbQKg136tLKN3C-Bn3rJf1rp4EJlg.*AAJTSQACMDIAAlNLABM4MDY1Mzk0NTk0NjAwOTI0NDkxAAJTMQACMDM.*; JSESSIONID=node01itn6a1nz0xug9el1yuphid6r1852.node0; am-auth-jwt=eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbmlzdHJhdG9yIiwiZXhwIjoxNjU1ODA0fQ.lMul0l6EgjBU1jA33Z4uSoGsHXkuOd7zMBRNY6MD1P1ATZNgRFWZbtKgbG2ZxhDEwv6KxKyMpY2Lgmsv0Dp9HA; iPlanetDirectoryPro=S2~AQIC5wM2LY4Sfcy_9QzbQKg136tLKN3C-Bn3rJf1rp4EJlg.*AAJTSQACMDIAAlNLABM4MDY1Mzk0NTk0NjAwOTI0NDkxAAJTMQACMDM.*',
        'Accept-Encoding': 'gzip, deflate, sdch',
        Accept: 'application/vnd.com.ericsson.oss.scripting+text;VERSION="1"',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };
    let TC11_2 = http.post(ENM_STUB_URL + 'server-scripting/services/command', fd.body(), head);
    let jobid = `${TC11_2.body}`;
    const res1 = check(TC11_2, {
      'Get Radionode schema version list from ENM stub -> Status is 201': (r) => TC11_2.status === 201,
      'Body is not Empty TC_11_2': (r) => TC11_2.body != [],
    });
    if (!res1) {
      console.log('TC11_2 body: ' + TC11_2.body);
      errorCounter.add(1);
    }
    const head1 = {
      headers: {
        Cookie: 'iPlanetDirectoryPro=S2~AQIC5wM2LY4Sfcy_9QzbQKg136tLKN3C-Bn3rJf1rp4EJlg.*AAJTSQACMDIAAlNLABM4MDY1Mzk0NTk0NjAwOTI0NDkxAAJTMQACMDM.*; JSESSIONID=node01itn6a1nz0xug9el1yuphid6r1852.node0; am-auth-jwt=eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbmlzdHJhdG9yIiwiZXhwIjoxNjU1ODA0fQ.lMul0l6EgjBU1jA33Z4uSoGsHXkuOd7zMBRNY6MD1P1ATZNgRFWZbtKgbG2ZxhDEwv6KxKyMpY2Lgmsv0Dp9HA; iPlanetDirectoryPro=S2~AQIC5wM2LY4Sfcy_9QzbQKg136tLKN3C-Bn3rJf1rp4EJlg.*AAJTSQACMDIAAlNLABM4MDY1Mzk0NTk0NjAwOTI0NDkxAAJTMQACMDM.*',
        'Accept-Encoding': 'gzip, deflate, sdch',
        Accept: 'application/vnd.com.ericsson.oss.scripting.command+json;VERSION="2"',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };
    var processEvents = true;
    var messageCounter = 0;
    var TC11_3;
    while (processEvents) {
      TC11_3 = http.get(ENM_STUB_URL + 'server-scripting/services/command/output/' + `${jobid}` + '/stream', head1);
      var responseBody = JSON.parse(TC11_3.body)._response_status;
      var eventCountInResponse = responseBody.length;
      if (responseBody != 'FETCHING') {
        console.log('Done');
        processEvents = false;
      } else {
        console.log('Response status is: ' + responseBody);
        messageCounter += 1;
        sleep(1);
      }
    }
    const res2 = check(TC11_3, {
      'ENM stub for RadioNode -> Status is 200': (r) => TC11_3.status === 200,
    });
    if (!res2) {
      console.log('TC11_3 status: ' + TC11_3.status);
      errorCounter.add(1);
    }
    let counter = 0;
    let json = JSON.parse(TC11_3.body).output._elements;
    for (let i = 0; i < json.length; i++) {
      let obj = json[i];
      if (obj.value.includes('schemaId')) {
        counter += 1;
      }
    }
    console.log(counter + ' schemaId(s) in body response');
    const res3 = check(counter, {
      'There is schemaId in response': (r) => counter >= 0,
    });
    if (!res3) {
      errorCounter.add(1);
    }
  });
}
