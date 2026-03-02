const SERVER_URL = document.querySelector('.img-upload__form').action.replace(/\/$/, '');

const ROUTES = {
  GET: '/data',
  POST: '/',
};

const request = (route, method = 'GET', body = null) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
        return;
      }
      reject(new Error(`${xhr.status} ${xhr.statusText}`));
    });

    xhr.addEventListener('error', () => reject(new Error('Network Error')));
    xhr.addEventListener('timeout', () => reject(new Error('Request Timeout')));

    xhr.open(method, `${SERVER_URL}${route}`);
    xhr.send(body);
  });

const getData = () => request(ROUTES.GET);

const sendData = (body) => request(ROUTES.POST, 'POST', body);

/*const checkResponse = (response) => {
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response;
};

const getData = () =>
  fetch(`${SERVER_URL}${ROUTES.GET}`)
    .then(checkResponse)
    .then((response) => response.json());

const sendData = (body) =>
  fetch(`${SERVER_URL}${ROUTES.POST}`, {
    method: 'POST',
    body,
  }).then(checkResponse);*/

export { getData, sendData };
