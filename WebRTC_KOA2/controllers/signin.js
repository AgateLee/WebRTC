const model = require('../model');
const crypto = require('crypto');

let User = model.User;

module.exports = {
    'GET /signin': async (ctx, next) => {
        if(ctx.cookies.get('name') !== undefined) {
            ctx.render('webrtc.html', {
                title: 'Sign In OK',
                name: ctx.cookies.get('sipname')
            });
        } else {
            ctx.cookies.set('prompt', null);

            ctx.render('index.html', {
                title: 'Welcome'
            });
        }
    },

    'POST /signin': async (ctx, next) => {
        var
            username = ctx.request.body.username || '',
            password = ctx.request.body.password || '';
        var userdata = await User.findOne({where: {name : username}});
        var sha1 = crypto.createHash('sha1');
        sha1.update(password);

        if (userdata !== null && userdata.passwd === sha1.digest('hex')) {
            console.log('signin ok!');
            userdata.last_time = Date.now();
            await userdata.save();
            var myDate = new Date();
            let user = {
                id: userdata.id,
                name: username,
                image: myDate.getSeconds() % 20
            };

            let value = Buffer.from(JSON.stringify(user)).toString('base64');
            console.log(`Set cookie value: ${value}`);
            ctx.cookies.set('name', value, {httpOnly:false});
            ctx.cookies.set('sipname', username, {httpOnly:false});
            ctx.cookies.set('sippasswd', password, {httpOnly:false});

            ctx.render('webrtc.html', {
                title: 'Sign In OK',
                name: username,
                headicon: '/static/images/' + user.image + '.png'
            });
        } else {
            console.log('signin failed!');
            ctx.render('signin-failed.html', {
                title: 'Sign In Failed'
            });
        }
    }
};