import http from 'k6/http';
import { check } from 'k6';
import { IAM_HOST, clientId } from './constants.js';

export const getKeycloakToken = () => {
  let url = `${IAM_HOST}auth/realms/master/protocol/openid-connect/token`;
  let body = {
    username: 'gas-user',
    password: 'Ericsson123!',
    client_id: 'admin-cli',
    grant_type: 'password',
  };
  let params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
    },
  };
  let response = http.post(url, body, params);
  console.log('getKeycloakToken status: ' + response.status);
  check(response, {
    'Get keycloack token status should be 200': (r) => r.status === 200,
  });

  return response;
};

export const setKeycloakTokenDuration = (token) => {
  let params = {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Cookie: {},
    },
  };

  let url = `${IAM_HOST}auth/admin/realms/master`;
  let body = JSON.stringify({ accessTokenLifespan: 10800, ssoSessionIdleTimeout: 10800 });
  let response = http.put(url, body, params);

  check(response, {
    'Setting token duration on Keycloack status should be 204': (r) => r.status === 204,
  });

  console.log('Setting token duration on Keycloack result: ' + response.status);

  return response;
};

export const createClient = (token, clientId) => {
  let url = `${IAM_HOST}auth/admin/realms/master/clients`;
  let params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  let body = {
    clientId: clientId,
    enabled: true,
    attributes: {
      ExternalClient: 'True',
      'client_credentials.use_refresh_token': 'True',
    },
    serviceAccountsEnabled: true,
    standardFlowEnabled: false,
    secret: '',
  };
  let response = http.post(url, JSON.stringify(body), params);
  console.log('createClient Status: ' + response.status);

  check(response, {
    'Create client on Keycloack status should be 201': (r) => r.status === 201,
  });

  return response;
};

export const getClientIdList = (token, clientId) => {
  let url = `${IAM_HOST}auth/admin/realms/master/clients?clientId=${clientId}`;
  let params = {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: {},
      Accept: '*/*',
    },
  };
  let response = http.get(url, params);
  console.log('getClientIdList Status: ' + response.body);
  check(response, {
    'Get ClientID list status should be 200': (r) => r.status === 200,
  });
  return response;
};

export const getServiceRolesIdList = (token, serviceRolesId) => {
  let url = `${IAM_HOST}auth/admin/realms/master/users/${serviceRolesId}/role-mappings/realm/available`;
  let params = {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: {},
      Accept: '*/*',
    },
  };
  let response = http.get(url, params);
  check(response, {
    'Get Service roles list status should be 200': (r) => r.status === 200,
  });
  console.log('Get service roles list ID result: ' + response.status);
  return response;
};

export const getServiceRolesId = (token, idList) => {
  const url = `${IAM_HOST}auth/admin/realms/master/clients/${idList}/service-account-user`;
  let params = {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: {},
      Accept: '*/*',
    },
  };
  let response = http.get(url, params);
  check(response, {
    'Get Service Role id status should be 200': (r) => r.status === 200,
  });
  console.log('Get Service Role Id result: ' + response.status);
  return response;
};

export const setServiceRoles = (token, serviceRolesId, realmRoles) => {
  let url = `${IAM_HOST}auth/admin/realms/master/users/${serviceRolesId}/role-mappings/realm/`;
  let params = {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Accept: '*/*',
      Cookie: {},
    },
  };
  let response = http.post(url, JSON.stringify(realmRoles), params);
  check(response, {
    'Set service roles on Keycloack status should be 204': (r) => r.status === 204,
  });
  console.log('Service roles on Keycloack result: ' + response.status);
  return response;
};

export const regenerateClientSecret = (token, clientId) => {
  let url = `${IAM_HOST}auth/admin/realms/master/clients/${clientId}/client-secret`;
  console.log('URL is : ' + url);
  let params = {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
  };
  let response = http.post(url, null, params);
  console.log('RegenerateClientSecret Status: ' + response.status);
  check(response, {
    'Change Client secret status should be 200': (r) => r.status === 200,
  });
  return response;
};

export const getKeycloakTokenSecret = (clientId, clientSecret) => {
  let url = `${IAM_HOST}auth/realms/master/protocol/openid-connect/token`;
  let body = {
    client_id: clientId,
    client_secret: clientSecret,
    tenant: 'master',
    grant_type: 'client_credentials',
  };
  let params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
    },
  };
  let response = http.post(url, body, params);
  console.log('getKeycloakTokenSecret Status: ' + response.status);
  check(response, {
    'Get keycloack token secret status should be 200': (r) => r.status === 200,
  });

  return response;
};
