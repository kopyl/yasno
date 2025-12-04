const https = require('https');

const ADDRESS_API_URL = 'https://app.yasno.ua/api/blackout-service/public/shutdowns/addresses/v2/group';
const OUTAGES_API_URL = 'https://app.yasno.ua/api/blackout-service/public/shutdowns/regions/25/dsos/902/planned-outages';

export async function GET(req) {
    const url = new URL(req.url);
    const streetId = url.searchParams.get('streetId');
    const houseId = url.searchParams.get('houseId');

    const fetchJson = (url) => new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    const params = new URLSearchParams({
        regionId: '25',
        streetId: streetId,
        houseId: houseId,
        dsoId: '902',
    });

    const [groupData, outagesData] = await Promise.all([
        fetchJson(`${ADDRESS_API_URL}?${params}`),
        fetchJson(OUTAGES_API_URL)
    ]);

    const groupSubgroup = `${groupData.group}.${groupData.subgroup}`;

    const outages = outagesData[groupSubgroup].today.slots
        .filter(o => o.type === 'Definite')
        .map(o => {
            const formatTime = (minutes) => {
                const h = String(Math.floor(minutes / 60)).padStart(2, '0');
                const m = String(minutes % 60).padStart(2, '0');
                return `${h}:${m}`;
            };
            return [formatTime(o.start), formatTime(o.end)];
        });

    const formattedOutages = outages.map(([start, end]) => `${start} - ${end}`);
    return Response.json(formattedOutages);
}