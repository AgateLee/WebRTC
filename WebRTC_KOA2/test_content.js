const model = require('./model');

let User = model.User;

(async () => {
        var user = await User.findAll({where : {name : 'aa'}});
        console.log(user);
        console.log(user.length);
        for (let p of user) {
            console.log(JSON.stringify(p));
            p.last_time = Date.now();
            await p.save();
        }
})();
