module.exports = inject;

var fs = require('fs');

function inject(serv) {
    
    serv.loadPlugins = loadPlugins;
    
    serv.loadPlugins();
    
    function resetPlayers() {
        for (var p in serv.players) {
            var player = serv.players[p]
            player.plugins = Array();
            for (var pl in serv.plugins) {
                var plugin = serv.plugins[pl];
                player.plugins[plugin.id] = {};
                require(plugin.path)(serv, player, plugin);
            }
            console.log(serv.players[p].plugins);
        }
    }
    
    serv.reloadPlugins = function() {
        console.log('RELOADING DOES NOT WORK');
        return;
        serv.emit('pluginend');
        resetPlayers();
    }
    
    serv.fullReloadPlugins = function(cb) {
        console.log('RELOADING DOES NOT WORK');
        return;
        serv.emit('pluginend');
        serv.loadPlugins(function() {
            resetPlayers();
            cb();
        });
    }
    
    serv.getPlugin = function(name) {
        return serv.plugins[name] || null;
    }
}

function loadPlugins(cb) {
    var serv = this;
    serv.plugins = Array();
    
    loadCount = 0;
    allPlugins = null;
    
    getNodeModules(serv, setPluginsFromModules, cb);
    
    var pluginPath = __dirname.match(/(.*?)\/lib/)[1] + '/plugins'; // Prob a cleaner way to do this
    fs.readdir(pluginPath, function(err, arr) {
        if (!arr) setPlugins([], serv);
        else {
            var plugins = Array();
            for (var a in arr) {
                if (arr[a].indexOf('.') == 0 || arr[a] == 'README.md') continue;
                plugins.push({
                    name: arr[a],
                    path: pluginPath + '/' + arr[a]
                });
            }
            setPlugins(plugins, serv, cb);
        }
    });
}

function setPluginsFromModules(err, modules, serv, cb) {
    if (err) {
        console.log('ERROR: Error loading node_modules; Cannot load external plugins! /lib/serverPlugins/plugins.js');
        serv.emit('error',err);
        return;
    }
    
    var plugins = Array();
    for (var m in modules) {
        if (m.indexOf('flying-squid-') == 0) {
            var pluginName = m.replace('flying-squid-','');
            plugins.push({
                name: pluginName,
                path: pluginName
            });
        }
    }
    setPlugins(plugins, serv, cb);
}

var loadCount = 0;
var allPlugins;
function setPlugins(plugins, serv, cb) {
    loadCount++;
    if (loadCount < 2) { // Wait for both plugins folder and node_modules to load
        allPlugins = plugins;
        return;
    } else {
        plugins = plugins.concat(allPlugins).sort(); // Sorting makes it easy to check duplicates
    }
    
    var id = 0;
    for (var p in plugins) {
        serv.plugins[plugins[p].name] = { // Other info about plugin here, TODO: Add events (i.e. ".on"), allow cancels?
            id: id,
            path: plugins[p].path,
            name: plugins[p].name
        };
        console.log('Loaded plugin: ' + plugins[p].name);
        id++;
        if (p < plugins.length-1 && plugins[p].name == plugins[parseInt(p)+1].name) { // Only checks for two duplicates, TODO: check for 3+ duplicates
            p++;
        }
    }
    console.log('Loaded ' + id + ' Plugin' + (id != 1 ? 's' : '') );
    if (cb) cb();
}

function getNodeModules(serv, cb, cb2) {
    require('child_process').exec('npm ls --json', function(err, stdout, stderr) {
        if (err) return cb(err, null, serv, cb2);
        cb(null, JSON.parse(stdout).dependencies, serv, cb2);
    });
}