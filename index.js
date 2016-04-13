'use strict';

const request = require('superagent');
const mkpath = require('mkpath');
const redis = require("redis").createClient();
const _ = require('lodash');
const fs = require('fs');

const URL = "http://photobucket.com/recentuploads?page=1";
const EXPIRE = 604800; // in second (1week)

function getKey(key) {
	return new Promise((resolve, reject) => {
		redis.get(key, (err, reply) => {
			if (err) {
				reject(err);
			}
			resolve(reply);
		});
	});
};
function setValue(key, value) {
	return new Promise((resolve) => {
		redis.set(key, value, () => {
			resolve();
		});
		redis.expire(key, EXPIRE);
	});
};
function deleteAll() {
	return new Promise((resolve, reject) => {
		redis.flushall((success) => {
			return success ? resolve(true) : reject(false);
		});
	});
};

function makeRequest() {
	request
	.get('http://photobucket.com/component/Common-PageCollection-Recent-RecentPageCollection?filters[recentUploads]=recentUploads&filters[media_type]=image&json=1&hash=c488c5301095e2d03816dcf1dca127f9&_=1460535782236')
	.query({ sort:1 })
	.query({ limit:24 })
	.query({ page:1 })
	.set('Accept', 'application/json, text/javascript, */*; q=0.01')
	.set('X-Requested-With', 'XMLHttpRequest')
	.end((err, res) => {
		let objects = res.body.body.objects;
		let usernames = [];
		_.forEach(objects, (obj) => {
			getKey(obj.username).then((isKey) => {
				if (!isKey && usernames.indexOf(obj.username) === -1) {
					setValue(obj.username, true);
					usernames.push(obj.username);
					request
					.get(obj.fullsizeUrl)
					.end((err, res) => {
						fs.writeFile(`pictures/${obj.username}.png`, res.body, 'binary', (err) => {
							let html = `<meta HTTP-EQUIV="REFRESH" content="0; url=http://photobucket.com/user/${obj.username}/library/?view=recent&page=1">`
							fs.writeFile(`pictures/${obj.username}.html`, html, (err) => {

							});
						});
					});
				}
			});
		});
		makeRequest();
	})
}
mkpath('pictures');
makeRequest();
