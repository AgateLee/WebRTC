module.exports = {
    'GET /': async (ctx, next) => {
        ctx.render('index.html', {
            title: 'Welcome'
        });
    },

    'GET /signout': (ctx, next) => {
        ctx.cookies.set('prompt', null);
        ctx.cookies.set('name', null);

        ctx.render('index.html', {
            title: 'Welcome'
        });
    }
};