'use strict';

var map;
var geojson;
var cur_style = "basic";
var cur_posession;
var cur_marker;
const content = {};
const id_layer_map = {};

const sum_fields = {
    "rooms": ['rooms', 'heated_rooms', 'chambers'],
    "storage": ['hallways', 'basements', 'warehouses'],
    "food": ['kitchens', 'bakeries', 'breweries'],
    "commerce": ['stores', 'inns'],
    "stables": ['stables'],
};

const profession_groups = {
    "auksakalys": {
        "professions": ["auksakalys", "monetų kalėjas"],
        "color": "goldsmith",
    },
    "kalvis": {
        "professions": ["ginklininkas", "kalvis", "kardininkas", "katilius", "liejikas", "šaltkalvis"],
        "color": "smith",
    },
    "gydytojas": {
        "professions": ["daktaras", "gydytojas", "barzdaskutys", "vaistininkas"],
        "color": "doctor",
    },
    "siuvėjas": {
        "professions": ["audinių dažytojas", "audėjas", "maišadirbys", "siuvėjas"],
        "color": "tailor",
    },
    "odadirbys": {
        "professions": ["balnius", "baltušnikas", "batsiuvys", "kailiadirbys", "kepurininkas", "odininkas", "šikšnius", "zomšininkas"],
        "color": "leather",
    },
    "menininkas": {
        "professions": ["liutnininkas", "muzikantas", "smuikininkas", "tapytojas", "trimitininkas", "vargonininkas"],
        "color": "artist",
    },
    "stalius": {
        "professions": ["dailidė", "kubilius", "račius", "stalius"],
        "color": "carpenter",
    },
    "mūrininkas": {
        "professions": ["akmentašys", "mūrininkas", "plytininkas"],
        "color": "mason",
    },
    "mėsininkas": {
        "professions": ["mėsininkas", "virėjas", "žvejys"],
        "color": "butcher",
    },
    "pirklys": {
        "professions": ["audinių pardavėjas", "pirklys", "smuklininkas"],
        "color": "merchant",
    },
    "amatininkas": {
        "professions": ["laikrodininkas", "malūnininkas", "muiladirbys", "parakininkas", "salietrininkas", "stiklius", "raštininkas", "knygrišys", "tarnautojas"],
        "color": "artisan",
    },
    "dvasininkas": {
        "professions": ["katalikų dvasininkas", "liuteronų dvasininkas", "reformatų dvasininkas", "unitų dvasininkas", "stačiatikių dvasininkas", "žydų dvasininkas"],
        "color": "clergy",
    },
    "bajoras": {
        "professions": ["bajoras"],
        "color": "gentry",
    },
};

const title_groups = {
    "dvaro": {
        "color": "court",
    },
    "katalikų": {
        "color": "catholic",
    },
    "liuteronų": {
        "color": "lutheran",
    },
    "ministrai": {
        "color": "minister",
    },
    "reformatų": {
        "color": "reformed",
    },
    "senatas": {
        "color": "senate",
    },
    "stačiatikių": {
        "color": "orthodox",
    },
    "taryba": {
        "color": "townhall",
    },
    "tribunolas": {
        "color": "tribunal",
    },
    "unitų": {
        "color": "uniate",
    },
    "žemės teismas": {
        "color": "court",
    },
    "žemietija": {
        "color": "palatinate",
    },
    "žydų": {
        "color": "jewish",
    },
};

const guest_groups = {
    "dvaro": {
        "color": "court",
    },
    "ministrai": {
        "color": "minister",
    },
    "muzikantai": {
        "color": "artist",
    },
    "rūmų": {
        "color": "palace",
    },
    "senatas": {
        "color": "senate",
    },
    "šeima": {
        "color": "family",
    },
    "tribunolas": {
        "color": "tribunal",
    },
    "žemietija": {
        "color": "palatinate",
    },
};

const profession_group_map = {};
Object.keys(profession_groups).forEach(group => {
    profession_groups[group]["professions"].forEach(profession => {
        profession_group_map[profession] = group;
    });
});

const sum_max = {};
const sum_average = {};
const professions = {};
const titles = {};
const profession_group_counts = {};

const base_style = {
    "fillOpacity": 0.5,
    "weight": 2,
    "color": getThemeColor("grey"),
    "fillColor": getThemeColor("grey"),
};
const hover_style = {"weight": 3};
const combined_theme = function(id, props) {
    return Object.assign(
        {},
        base_style,
        props,
    );
}
const summed_theme = function(key) {
    return (f) => {
        const id = f.properties.id || undefined;
        if (!id || !content || !content[id]) return base_style;
        const step = 1 / sum_average[key];
        const value = content[id]['sum_' + key];
        let color = value == null
            ? getThemeColor('grey')
            : getThemeColor('theme_' + key);
        let opacity = 0.75;
        let weight = 2;
        let fill_color;
        if (value == null) {
            color = getThemeColor('grey');
            fill_color = color;
            opacity = 0.25;
            weight = 1;
        } else if (value == 0) {
            color = getThemeColor('white');
            fill_color = color;
            weight = 1;
        } else {
            color = getThemeColor('theme_' + key);
            let grade = 1 - (step * value);
            if (grade < 0) {
                grade = -1 * (1 / sum_max[key]) * value;
            }
            fill_color = pSBC(grade, color, false, true);
        }

        return combined_theme(id, {"fillOpacity": opacity, "color": color, "fillColor": fill_color, "weight": weight});
    };
}
const feature_styles = {
    "basic": f => base_style,
    "hover": f => hover_style,
    "theme_material": f => {
        const id = f.properties.id || undefined;
        if (!id || !content || !content[id]) return base_style;
        let color, fill_color, opacity, weight;
        let floor_count = 0;
        
        const floors = content[id]["floors"];
        switch (floors) {
            case "?":
            case "":
                color = getThemeColor('grey');
                opacity = 0;
                weight = 1;
            break;
            case "—":
                color = getThemeColor('white');
                opacity = 0;
                weight = 1;
            break;
            default:
                opacity = 0.75;
                weight = 2;
                floor_count = parseInt(floors);
            break;
        }

        const material = content[id]["material"];
        switch (material) {
            case "?":
            case "":
                fill_color = getThemeColor('grey');
                opacity = 0;
            break;
            case "—":
                fill_color = getThemeColor('white');
                opacity = 0;
            break;
            case "2":
                fill_color = getThemeColor('material_brick');
                color = adjustColor(fill_color, -30);
            break;
            case "1":
            default:
                fill_color = getThemeColor('material_wood');
                color = adjustColor(fill_color, -30);
            break;
        }
        
        if (floor_count) {
            fill_color = pSBC(1 - ((1+floor_count) / 4), fill_color, false, true);
        }
        return combined_theme(id, {"color": color || fill_color, "fillColor": fill_color || color, "fillOpacity": opacity, "weight": weight});
    },
    "theme_rooms": summed_theme('rooms'),
    "theme_storage": summed_theme('storage'),
    "theme_food": summed_theme('food'),
    "theme_commerce": summed_theme('commerce'),
    "theme_stables": summed_theme('stables'),
    "theme_confidence": f => {
        const id = f.properties.id || undefined;
        const step = 1 / 5;
        const value = 6 - f.properties.confidence;
        let color = getThemeColor('theme_confidence');
        let opacity = 0.75;
        let weight = 2;
        let fill_color;
        let grade = 1 - (step * value);
        if (grade < 0) {
            grade = -1 * (1 / 5) * value;
        }
        fill_color = pSBC(grade, color, false, true);

        return combined_theme(id, {"fillOpacity": opacity, "color": color, "fillColor": fill_color, "weight": weight});
    },
    "theme_jurisdiction": f => {
        const id = f.properties.id || undefined;
        if (!id || !content || !content[id]) return base_style;
        const jurisdiction = content[id]['jurisdiction'];
        const output = {...base_style};
        if (isNaN(parseInt(jurisdiction)) || jurisdiction.includes('?')) {
            output['fillOpacity'] = 0.25;
        } else {
            output['fillOpacity'] = 0.75;
        }

        let color;
        switch (parseInt(jurisdiction)) {
            case 1:
                color = getThemeColor('jurisdiction_city');
            break;
            case 2:
                color = getThemeColor('jurisdiction_catholic');
            break;
            case 3:
                color = getThemeColor('jurisdiction_castle');
            break;
            case 4:
                color = getThemeColor('jurisdiction_bishop');
            break;
            default:
                color = getThemeColor('grey');
                output['weight'] = 1;
            break;
        }

        output['fillColor'] = color;
        output['color'] = adjustColor(color, -30);

        return combined_theme(id, output);
    },
    "theme_profession": f => {
        const id = f.properties.id || undefined;
        if (!id || !content || !content[id]) return base_style;
        const item_professions = content[id]['occupant_profession_groups'];
        const output = {};
        if (item_professions[0]) {
            output.fillColor = getThemeColor('profession_' + profession_groups[item_professions[0]]["color"]);
            output.fillOpacity = 0.75;
            output.weight = 2;
        } else {
            output.fillColor = getThemeColor('grey');
            output.fillOpacity = 0.25;
            output.weight = 1;
        }
        output.color = adjustColor(output.fillColor, -30);

        return combined_theme(id, output);
    },
    "theme_title": f => {
        const id = f.properties.id || undefined;
        if (!id || !content || !content[id]) return base_style;
        const item_title_rank = content[id]['occupant_title_rank'];
        const output = {};
        if (item_title_rank) {
            output.fillColor = getThemeColor('title_' + title_groups[item_title_rank]["color"]);
            output.fillOpacity = 0.75;
            output.weight = 2;
        } else {
            output.fillColor = getThemeColor('grey');
            output.fillOpacity = 0.25;
            output.weight = 1;
        }
        output.color = adjustColor(output.fillColor, -30);
        return combined_theme(id, output);
    },
    "theme_guest": f => {
        const id = f.properties.id || undefined;
        if (!id || !content || !content[id]) return base_style;
        const item_guest_group = content[id]['guest_group'];
        const output = {
            fillOpacity: 0.75,
            weight: 2,
        };
        if (item_guest_group) {
            output.fillColor = getThemeColor('guest_' + guest_groups[item_guest_group]["color"]);
        } else if (content[id]['guest'] == '—') {
            output.fillColor = getThemeColor('white');
            output.color = getThemeColor('white');
        } else {
            output.fillColor = getThemeColor('grey');
            output.fillOpacity = 0.25;
            output.weight = 1;
        }
        if (!output.color) {
            output.color = adjustColor(output.fillColor, -30);
        }
        return combined_theme(id, output);
    },
};

const field_mappings = {
    "confidence": {
        "5": "žemiausias - spėjama vieta",
        "4": "žemas - apytikslė vieta",
        "3": "vidutinis - tikėtina vieta, spėjamos ribos",
        "2": "aukštas - pagrįsta vieta, apytikslės ribos",
        "1": "aukščiausias - žinoma vieta, pagrįstos ribos",
    },
    "id_1636": value => {
        if (isNaN(parseInt(value))) return '';
        return '(#' + value.padStart('0', 3) + ')';
    },
    "jurisdiction": value => {
        const definitions = {
            "1": "miesto",
            "2": "kapitulos",
            "3": "pilies",
            "4": "vyskupo",
        };
        const defined_jurisdiction = parseInt(value);
        const is_uncertain = defined_jurisdiction != value;
        let output = definitions[defined_jurisdiction] || value;
        if (is_uncertain) {
            output += '?';
        }
        return output;
    },
    "material": {
        "1": "medinis",
        "2": "mūrinis",
    },
    "occupant_professions": value => {
        return value.join('; ');
    },
    "occupant_title": (value, data) => {
        if (value) {
            return [data["occupant_title_region"], value].filter(x => !!x).join(' ');
        } else if (data["occupant_title_rank"]) {
            return "[" + data["occupant_title_rank"] + "]";
        } else {
            return "?";
        }
    },
    "guest": (value, data) => {
        if (value) {
            return [data["guest_region"], value].filter(x => !!x).join(' ');
        } else {
            return "?";
        }
    },
};

function getThemeColor(name) {
    let style = window.getComputedStyle(document.querySelector(':root'));
    return style.getPropertyValue('--c-' + name).trim();
}

function getColorByIndex(index) {
    const hue = (index + 2) * 137.508 * 2;
    return `hsl(${hue},65%,30%)`;
}

function getLatLonCenterFromGeom (coords) {
    const arrAvg = arr => arr.reduce((a,b) => a + b, 0) / arr.length;

    const centerLat = arrAvg(coords.map(c=>c[1]));
    const centerLon = arrAvg(coords.map(c=>c[0]));

    if (isNaN(centerLat)|| isNaN(centerLon))
        return null;
    else return [centerLat, centerLon];
}

function adjustColor(color, amount) {
    return '#' + color
        .replace(/^#/, '')
        .replace(/../g, c =>
            ('0'+Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).substr(-2)
        );
}

/**
 * By Pimp Trizkit at https://stackoverflow.com/a/13542669
 */
const pSBC=(p,c0,c1,l)=>{
    let r,g,b,P,f,t,h,i=parseInt,m=Math.round,a=typeof(c1)=="string";
    if(typeof(p)!="number"||p<-1||p>1||typeof(c0)!="string"||(c0[0]!='r'&&c0[0]!='#')||(c1&&!a))return null;
    if(!this.pSBCr)this.pSBCr=(d)=>{
        let n=d.length,x={};
        if(n>9){
            [r,g,b,a]=d=d.split(","),n=d.length;
            if(n<3||n>4)return null;
            x.r=i(r[3]=="a"?r.slice(5):r.slice(4)),x.g=i(g),x.b=i(b),x.a=a?parseFloat(a):-1
        }else{
            if(n==8||n==6||n<4)return null;
            if(n<6)d="#"+d[1]+d[1]+d[2]+d[2]+d[3]+d[3]+(n>4?d[4]+d[4]:"");
            d=i(d.slice(1),16);
            if(n==9||n==5)x.r=d>>24&255,x.g=d>>16&255,x.b=d>>8&255,x.a=m((d&255)/0.255)/1000;
            else x.r=d>>16,x.g=d>>8&255,x.b=d&255,x.a=-1
        }return x};
    h=c0.length>9,h=a?c1.length>9?true:c1=="c"?!h:false:h,f=this.pSBCr(c0),P=p<0,t=c1&&c1!="c"?this.pSBCr(c1):P?{r:0,g:0,b:0,a:-1}:{r:255,g:255,b:255,a:-1},p=P?p*-1:p,P=1-p;
    if(!f||!t)return null;
    if(l)r=m(P*f.r+p*t.r),g=m(P*f.g+p*t.g),b=m(P*f.b+p*t.b);
    else r=m((P*f.r**2+p*t.r**2)**0.5),g=m((P*f.g**2+p*t.g**2)**0.5),b=m((P*f.b**2+p*t.b**2)**0.5);
    a=f.a,t=t.a,f=a>=0||t>=0,a=f?a<0?t:t<0?a:a*P+t*p:0;
    if(h)return"rgb"+(f?"a(":"(")+r+","+g+","+b+(f?","+m(a*1000)/1000:"")+")";
    else return"#"+(4294967296+r*16777216+g*65536+b*256+(f?m(a*255):0)).toString(16).slice(1,f?undefined:-2)
}

function loadGeoJson(data) {
    geojson = L.geoJson(data,
        {
            style: feature_styles.basic,
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: e => {
                        layer.bringToFront();
                        layer.setStyle(feature_styles.hover(feature));
                    },
                    mouseout:  e => layer.setStyle(feature_styles[cur_style](feature)),
                    click: e => {
                        let id = feature.properties.id;
                        selectPosession(id);
                    },
                });
                id_layer_map[feature.properties.id] = layer;
            }
        }
    );

    geojson.addTo(map);

    geojson.bindTooltip(layer => {
        const props = (layer.feature || {}).properties || {};
        const id = props.id || null;
        if (!id || !content[id]) return id;
        const data = content[id];
        let output = "<strong>" + (data['title_lt'] || id) + "</strong>";
        switch (cur_style) {
            case "theme_material":
                const material = field_mappings['material'][data['material']]
                    || data['material'];
                const floors = data['floors'] || '?';
                output += "<br>" + material + "; aukštų: " + floors;
            break;
            case "theme_rooms":
                output += "<br>Gyvenamųjų patalpų: "
                    + (
                        data['sum_rooms'] == null
                            ? '?'
                            : data['sum_rooms']
                    );
            break;
            case "theme_storage":
                output += "<br>Sandėliavimo patalpų: "
                    + (
                        data['sum_storage'] == null
                            ? '?'
                            : data['sum_storage']
                    );
            break;
            case "theme_food":
                output += "<br>Maisto gaminimo patalpų: "
                    + (
                        data['sum_food'] == null
                            ? '?'
                            : data['sum_food']
                    );
            break;
            case "theme_commerce":
                output += "<br>Prekybinių patalpų: "
                    + (
                        data['sum_commerce'] == null
                            ? '?'
                            : data['sum_commerce']
                    );
            break;
            case "theme_stables":
                output += "<br>Vietų arklidėse: "
                    + (
                        data['sum_stables'] == null
                            ? '?'
                            : data['sum_stables']
                    );
            break;
            case "theme_jurisdiction":
                const value = field_mappings['jurisdiction'](data['jurisdiction']) || '?';
                output += "<br>Jurisdika: " + value;
            break;
            case "theme_profession":
                output += "<br>Profesija / luomas: "
                    + (
                        data['occupant_professions'].length == 0
                            ? '?'
                            : data['occupant_professions'].join(', ')
                    );
            break;
            case "theme_title":
                output += "<br>Pareigybė: "
                    + field_mappings['occupant_title'](data['occupant_title'], data);
            break;
            case "theme_guest":
                output += "<br>Svečias: "
                    + field_mappings['guest'](data['guest'], data);
            break;
            case "theme_confidence":
                output += "<br>Tikslumas: "
                    + field_mappings['confidence'][props.confidence || 5];
            break;
            default:
                output += "";
            break
        }
        return output;
    });
}

function loadDataCsv(data) {
    let keys;
    data.forEach((row, i) => {
        if (i == 0) {
            keys = row;
            return;
        }

        let item = Object.fromEntries(keys.map((k, i) => [k, row[i]]));

        if (!item['id_1636']) return;
        let id = item['id_1636'];
        if (!isNaN(parseInt(id))) {
            id = id.toString().padStart(3, '0');
        }

        Object.keys(sum_fields).forEach(key => {
            item['sum_' + key] = sum_fields[key]
                .map(field => {
                    let parsed = parseInt(item[field]);
                    return isNaN(parsed) ? null : parsed;
                })
                .reduce((a, b) => (a==null)&&(b==null) ? null : a + b);

            if (!sum_max[key]) {
                sum_max[key] = item['sum_' + key];
            } else {
                sum_max[key] = Math.max(sum_max[key], item['sum_' + key]);
            }
        });

        item['occupant_professions'] = item['occupant_profession']
            .split('|')
            .map(x => x.trim())
            .filter(x => !!x);
        item['occupant_profession_groups'] = [];
        item['occupant_professions'].forEach(profession => {
            if (!profession) return;
            professions[profession] = (professions[profession] || 0) + 1;

            
            if (profession_group_map[profession]) {
                let group = profession_group_map[profession];
                item['occupant_profession_groups'].push(group);
                profession_group_counts[group] = (profession_group_counts[group] || 0) + 1;
            }
        });

        titles[item['occupant_title']] = (titles[item['occupant_title']] || 0) + 1;

        content[id] = item;
    });

    Object.keys(sum_fields).forEach(key => {
        let values = Object.keys(content)
            .map(id => content[id]['sum_' + key])
            .filter(a => a != null && a > 0)
            .sort((a,b) => a - b);

        const pos = (values.length - 1) * .9;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (values[base + 1] !== undefined) {
            sum_average[key] = values[base] + rest * (values[base + 1] - values[base]);
        } else {
            return values[base];
        }
    });
}

function applyCurStyle() {
    geojson.setStyle(feature_styles[cur_style]);
}

function displayTextBar(node) {
    document.getElementById('content-bar').innerHTML = node.innerHTML
        .replace(/\>\s*\</g, '><')
        .trim();
}

function displayTemplate(id) {
    let node = document.getElementById(id);
    if (node) {
        displayTextBar(node.cloneNode(true));
    }
}

function populateContentTemplate(id) {
    const data = content[id];
    if (!data) return;
    const section = document.getElementById('content-template').cloneNode(true);
    section.id = null;
    Object.keys(data).forEach(key => {
        const value = data[key] || '—';
        if (!value) return;
        section.querySelectorAll('[data-field="'+key+'"]').forEach(node => {
            node.innerText = value;
        });

        if (!field_mappings[key]) return;
        let mod_value;
        if (field_mappings[key] instanceof Function) {
            mod_value = field_mappings[key](value, data);
        } else {
            mod_value = field_mappings[key][value] || value;
        }
        section.querySelectorAll('[data-mod-field="'+key+'"]').forEach(node => {
            node.innerText = mod_value;
        });
    });
    return section;
}

function selectPosession(id) {
    if (!content[id]) return;
    cur_posession = id;
    displayTextBar(populateContentTemplate(id));
    let layer = id_layer_map[id];
    if (!layer) return;
    if (!cur_marker) {
        cur_marker = L.marker(layer.getBounds().getCenter()).addTo(map);
    }
    cur_marker.setLatLng(layer.getBounds().getCenter());

    let url = new URL(document.location);
    url.hash = '#pos:' + id;
    if (url.toString() !== document.location) {
        updateURL(url.toString());
    }
}

function processURL(url) {
    let hash = decodeURIComponent(new URL(url).hash);
    if (!hash) return;
    let parts = hash.split(':');
    if (parts.length < 2) return;
    switch (parts[0]) {
        case "#pos":
            selectPosession(parts[1]);
        break;
    }
}

function updateURL(url) {
    history.replaceState({}, "", url);
}

function onFullInit() {
    let input = document.querySelector('input[name=theme]:checked');
    if (input && input.value) {
        cur_style = input.value;
        applyCurStyle();
    }

    processURL(document.location);
}

window.addEventListener('load', async (event) => {
    displayTemplate('welcome-template');

    map = L.map(
        "map",
        {
            center: [54.67972, 25.28817],
            crs: L.CRS.EPSG3857,
            zoom: 10,
            zoomControl: true,
            preferCanvas: false,
            maxBounds: [[54.69879,25.25154], [54.66151,25.32371]],
        }
    );
    L.control.scale().addTo(map);
    const osm_layer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            "attribution": "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap contributors</a>",
            "detectRetina": false,
            "maxNativeZoom": 18,
            "maxZoom": 18,
            "minZoom": 0,
            "noWrap": false,
            "opacity": 1,
            "subdomains": "abc",
            "tms": false
        }
    ).addTo(map);
    
    
    map.fitBounds(
        [[54.67426, 25.27815], [54.68518, 25.29819]],
        {}
    );
    
    let geojson_promise = fetch('posesijos.geojson')
        .then(response => response.json())
        .then(data => loadGeoJson(data));

    let content_promise = fetch('posesijos.csv')
        .then(response => response.text())
        .then(data => loadDataCsv(data.csvToArray({rSep:"\n"})));

    document.querySelectorAll('input[name=theme]').forEach(node => {
        node.addEventListener('change', e => {
            cur_style = e.target.value;
            applyCurStyle();
        });
    });

    await geojson_promise;
    await content_promise;

    onFullInit();
});

document.addEventListener('click', async (event) => {
    if (event.target.dataset.displayTemplate) {
        displayTemplate(event.target.dataset.displayTemplate);
    }
});
