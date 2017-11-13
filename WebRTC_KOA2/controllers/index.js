module.exports = {
    'GET /': async (ctx, next) => {
        ctx.cookies.set('prompt', null);
        ctx.cookies.set('name', null);
        ctx.cookies.set('sipname', null);
        ctx.cookies.set('sippasswd', null);

        ctx.render('index.html', {
            title: 'Welcome'
        });
    },

    'GET /signout': (ctx, next) => {
        ctx.cookies.set('prompt', null);
        ctx.cookies.set('name', null);
        ctx.cookies.set('sipname', null);
        ctx.cookies.set('sippasswd', null);

        ctx.render('index.html', {
            title: 'Welcome'
        });
    }
};