const model = require('../model');
const crypto = require('crypto');

let User = model.User;

module.exports = {
    'POST /register': async (ctx, next) => {
        var
            username = ctx.request.body.username || '',
            password = ctx.request.body.password || '',
            password2 = ctx.request.body.password2 || '';
        var userdata = await User.findOne({where: {name : username}});

        if(userdata !== null) {
            ctx.cookies.set('prompt', 'Already exist, please choose another name.', {httpOnly:false});

            ctx.render('register.html', {
                title: 'Welcome'
            });
        } else if(password.length < 6 || (password !== password2)) {
            ctx.cookies.set('prompt', 'Please check your password (At least 6 chars).', {httpOnly:false});

            ctx.render('register.html', {
                title: 'Welcome'
            });
        } else {
            var sha1 = crypto.createHash('sha1');
            sha1.update(password);
            let total = await User.count();
            await User.findOrCreate({where: {name : username}, defaults: {
                id: total + 1,
                name: username,
                passwd: sha1.digest('hex'),
                ip: '',
                port: 0,
                state: 0,
                last_time: Date.now()
            }});

            ctx.render('index.html', {
                title: 'Welcome'
            });
        }
    },

    'GET /register': async (ctx, next) => {
        ctx.cookies.set('prompt', null);

        ctx.render('register.html', {
            title: 'Welcome'
        });
    }
};