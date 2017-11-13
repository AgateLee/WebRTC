const model = require('../model');

module.exports = {
    'GET /webrtc': async (ctx, next) => {
        if(ctx.cookies.get('name') !== undefined) {
            ctx.render('webrtc.html', {
                title: 'Welcome',
                name: ctx.cookies.get('sipname')
            });
        } else {
            ctx.cookies.set('prompt', null);

            ctx.render('index.html', {
                title: 'Please Sign In'
            });
        }
    },

    'POST /webrtc': async (ctx, next) => {
        if(ctx.cookies.get('name') !== undefined) {
            ctx.render('webrtc.html', {
                title: 'Welcome',
                name: ctx.cookies.get('sipname')
            });
        } else {
            ctx.cookies.set('prompt', null);

            ctx.render('index.html', {
                title: 'Please Sign In'
            });
        }
    }
};