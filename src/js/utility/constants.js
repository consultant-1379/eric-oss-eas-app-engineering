import encoding from 'k6/encoding';

//---URLs---

export const ENM_MODEL_ADAPTER_URL = 'http://eric-oss-enm-model-adapter:8080/';
export const ENM_DISCOVERY_ADAPTER_URL = 'http://eric-oss-enm-discovery-adapter:8080/';
export const ENM_NOTIFICATION_ADAPTER_URL = 'http://eric-oss-enm-notification-adapter:8080/';
export const NCMP_URL = 'http://eric-oss-ncmp:8080/';
export const ENM_ADAPTER_URL = 'http://eric-eo-enm-adapter:80/';
export const SUBSYSTEM_MANAGER_URL = 'http://eric-eo-subsystem-management:80/';
export const ENM_SIM_URL = 'http://eric-oss-enm-notification-simulator-for-app-eng:8080/exec/';
export const TOPOLOGY_CORE_URL = 'http://eric-oss-cmn-topology-svc-core:8080/';
export const TIEH_URL = 'http://eric-oss-top-inv-exposure:8080/';
export const RAN_TOPOLOGY_ADAPTER = 'http://eric-oss-ran-topology-adapter:8080/';
export const ENM_HOSTNAME = __ENV.ENM_HOSTNAME;
export const ENM_URL = ENM_HOSTNAME.includes('restsim') ? `http://${__ENV.ENM_HOSTNAME}` : `https://${__ENV.ENM_HOSTNAME}`;
export const ENM_CERTS_DIR = __ENV.ENM_CERTS_DIR;
export const CERTM_URL = 'http://eric-sec-certm:5003/';
export const ENM_STUB_URL = 'http://eric-eo-enm-stub-for-app-eng:80/';
export const OUTSIDE_API_GW_URL = `http://${__ENV.GAS_HOST}/`;
export const OUTSIDE_API_GW_TLS_URL = `https://${__ENV.GAS_HOST}/`;
export const IAM_HOST = `https://${__ENV.IAM_HOST}/`;
export const SEF_URL = 'http://eric-sef-exposure-api-manager:8080/';
export const RESTSIM_URL = 'http://eric-oss-restsim-release-for-app-eng:80';
export const PM_SERVER_URL = 'http://eric-pm-server:9090/';

//---Variables---

export const nodeModelIdRadio = '20.Q2-R6A06';
export const nodeModelIdvDU = '3446-616-766';
export const nodeModelIdSharedCNF = '2671-323-811';
export const cmHandlecount = 5; // NF_TC3 works with small cmHandleCount, 5 works for me (IDUN-39563)
export const CM_HANDLE_FOR_EMPTYSTRING = '9C591B0DC6E617C311F8685350B9F46C';
export const RESTSIMURL1 = __ENV.RESTSIM_URL1;
export const RESTSIMURL2 = __ENV.RESTSIM_URL2;
export const DISCOVERY_NODE_TYPES = __ENV.NODETYPES;
export const CHAR_TEST_TYPE = __ENV.CHAR_TEST_TYPE;
export var countOfCmHandles = 100;
export var cmHandlesList = ['FFF2618BC738C3766AAE748C18841150', '376BAF29C7D6CA79E192138E4E50F38D', 'FEA646A6A0E1F50EED1850E896F2BF9B', '5790F3D939B62196B9F6B426565C0DE1'];

//---Char test files---
//Won't be needed until automatic cert change detection is implemented in enm-adapter and enm-notification-adapter
//IDUN-91243
//export const cert_key = open(ENM_CERTS_DIR + ENM_HOSTNAME + '.txt');

const GEN_RESP = __ENV.GENERATE_RESPONSES;
const GEN_VALUE = __ENV.GENERATED_QUANTITY;
if (GEN_RESP == 'true') {
  countOfCmHandles = parseInt(GEN_VALUE);
}

//---Credentials---

export const clientId = 'k6_client';
export const CLIENT_ROLES = ['NetworkConfiguration_Application_ReadWrite', 'OSSPortalAdmin'];
export const CLIENT_ROLES_CHAR = ['NetworkConfiguration_Application_ReadWrite', 'ConnectedSystemRegistry_Application_SecurityAdministrator', 'ConnectedSystemRegistry_Application_ReadOnly'];
export const k6_user = 'k6test';
export const k6_password = 'K6testing123!';
export const enm_username = 'administrator';
export const enm_password = 'TestPassw0rd';

export const CTSCreds = 'sysadm';
export const encCTSCreds = encoding.b64encode(CTSCreds);

//---Parameters---

export const cm_ParamsNoAuth = {
  headers: {
    'Content-Type': `application/json`,
  },
  timeout: '1200s',
};

export const getCTS_Params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Basic ${encCTSCreds}`,
    'GS-Database-Name': 'eai_install',
    'GS-Database-Host-Name': 'localhost',
  },
  timeout: '7200s',
};

export const enm_Params = {
  headers: {
    accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
  },
};

export const postENM_Params = {
  headers: {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
  },
  timeout: '600s',
};

export const login_headers = {
  headers: {
    'X-Login': 'gas-user',
    'X-password': 'Ericsson123!',
  },
};
