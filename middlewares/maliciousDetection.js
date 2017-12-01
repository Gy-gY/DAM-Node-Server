// const uuidV1 = require('uuid/v1');
const svgCaptcha = require('svg-captcha');
import captchaStore from '../utils/captchaStore';

export function verifyCaptcha(req, res, next) {
    const captcha = req.body.captcha;
    if (!captcha) return res.status(400).json({message: '缺少验证码'});
    captchaStore.verifyToken(req.sessionID, captcha, (err, ok)=>{
        if (ok) return next();
        return res.status(403).json({message: '验证码错误或过期，请刷新验证码重试'});
    });
}

export function generateCaptcha(req, res) {
  // create a captcha and a token:
    let captcha = svgCaptcha.create({
        size: 4,
        noise: 0,
        width: 110,
        height: 36,
        fontSize: 35,
        ignoreChars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        charPreset: '1234567890'
    });
  // store the captcha
    const isSaved = captchaStore.saveToken(req.sessionID, captcha.text.toLowerCase());
    if (isSaved) {
        res.json({
            data: {
                captcha: captcha.data
            }
        });
    } else {
        res.status(500).end();
    }
}