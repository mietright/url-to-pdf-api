const chai = require('chai');
const fs = require('fs');
const http = require('http');
const request = require('supertest');
const { PDFParse } = require('pdf-parse');
const { getResource } = require('./util');
const createApp = require('../src/app');

const DEBUG = false;

const app = createApp();

function normalisePdfText(text) {
  // Replace all non-alphanumeric characters with a hyphen to resolve some difference in
  // character encoding when comparing strings extracted from the PDF and strings
  // defined in the test environment
  return text.replace(/[\W_]+/g, '-');
}

async function getPdfTextContent(buffer, opts = {}) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();

  if (opts.raw) {
    return result.text;
  }

  return normalisePdfText(result.text);
}

describe('GET /api/render', () => {
  it('request must have "url" query parameter', () =>
    request(app).get('/api/render').expect(400));

  it('invalid cert should cause an error', () =>
    request(app)
      .get('/api/render')
      .query({
        url: 'https://self-signed.badssl.com/',
      })
      .expect(500));

  it('invalid cert should not cause an error when ignoreHttpsErrors=true', () =>
    request(app)
      .get('/api/render')
      .query({
        url: 'https://self-signed.badssl.com/',
        ignoreHttpsErrors: true,
      })
      .expect(200));
});

describe('POST /api/render', () => {
  it('body must have "url" attribute', () =>
    request(app)
      .post('/api/render')
      .send({
        pdf: { scale: 2 },
      })
      .set('content-type', 'application/json')
      .expect(400));

  it('render external URL should succeed', function renderExternalUrlShouldSucceed() {
    this.timeout(10000);
    return request(app)
      .post('/api/render')
      .send({ url: 'https://example.com' })
      .set('content-type', 'application/json')
      .set('Connection', 'keep-alive')
      .expect(200)
      .expect('content-type', 'application/pdf')
      .then((response) => {
        const length = Number(response.headers['content-length']);
        chai.expect(length).to.be.above(1024 * 5);
      });
  });

  it('html in json body should succeed', () =>
    request(app)
      .post('/api/render')
      .send({ html: getResource('postmark-receipt.html') })
      .set('Connection', 'keep-alive')
      .set('content-type', 'application/json')
      .expect(200)
      .expect('content-type', 'application/pdf')
      .then((response) => {
        const length = Number(response.headers['content-length']);
        chai.expect(length).to.be.above(1024 * 40);
      }));

  it('html as text body should succeed', () =>
    request(app)
      .post('/api/render')
      .send(getResource('postmark-receipt.html'))
      .set('Connection', 'keep-alive')
      .set('content-type', 'text/html')
      .expect(200)
      .expect('content-type', 'application/pdf')
      .then((response) => {
        const length = Number(response.headers['content-length']);
        chai.expect(length).to.be.above(1024 * 40);
      }));

  it('rendering large html should succeed', () =>
    request(app)
      .post('/api/render')
      .send(getResource('large.html'))
      .set('content-type', 'text/html')
      .expect(200)
      .expect('content-type', 'application/pdf')
      .then((response) => {
        const length = Number(response.headers['content-length']);
        chai.expect(length).to.be.above(1024 * 1024 * 1);
      }));

  it('rendering html with large linked images should succeed', () =>
    request(app)
      .post('/api/render')
      .send(getResource('large-linked.html'))
      .set('content-type', 'text/html')
      .expect(200)
      .expect('content-type', 'application/pdf')
      .then((response) => {
        if (DEBUG) {
          console.log(response.headers);
          console.log(response.body);
          fs.writeFileSync('out.pdf', response.body, { encoding: null });
        }

        const length = Number(response.headers['content-length']);
        chai.expect(length).to.be.above(30 * 1024 * 1);
      }));

  it('cookies should exist on the page', async () => {
    const cookieHtml = getResource('cookie-test.html');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(cookieHtml);
    });
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const response = await request(app)
        .post('/api/render')
        .send({
          url: baseUrl,
          cookies: [
            {
              name: 'url-to-pdf-test',
              value: 'test successful',
              domain: '127.0.0.1',
            },
            {
              name: 'url-to-pdf-test-2',
              value: 'test successful 2',
              domain: '127.0.0.1',
            },
          ],
        })
        .set('Connection', 'keep-alive')
        .set('content-type', 'application/json')
        .expect(200)
        .expect('content-type', 'application/pdf');

      if (DEBUG) {
        console.log(response.headers);
        console.log(response.body);
        fs.writeFileSync('cookies-pdf.pdf', response.body, {
          encoding: null,
        });
      }

      const text = await getPdfTextContent(response.body);

      if (DEBUG) {
        fs.writeFileSync('./cookies-content.txt', text);
      }

      chai.expect(text).to.have.string('Number-of-cookies-received-2');
      chai.expect(text).to.have.string('Cookie-named-url-to-pdf-test');
      chai.expect(text).to.have.string('Cookie-named-url-to-pdf-test-2');
    } finally {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  it('special characters should be rendered correctly', () =>
    request(app)
      .post('/api/render')
      .send({ html: getResource('special-chars.html') })
      .set('Connection', 'keep-alive')
      .set('content-type', 'application/json')
      .expect(200)
      .expect('content-type', 'application/pdf')
      .then((response) => {
        if (DEBUG) {
          console.log(response.headers);
          console.log(response.body);
          fs.writeFileSync('special-chars.pdf', response.body, {
            encoding: null,
          });
        }

        return getPdfTextContent(response.body, { raw: true });
      })
      .then((text) => {
        if (DEBUG) {
          fs.writeFileSync('./special-chars-content.txt', text);
        }

        chai.expect(text).to.have.string('special characters: ä ö ü');
      }));
});

describe('GET /healthcheck', () => {
  it('should return ok', () => request(app).get('/healthcheck').expect(200));
});
