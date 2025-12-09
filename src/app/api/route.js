const STREETS_API_URL = 'https://app.yasno.ua/api/blackout-service/public/shutdowns/addresses/v2/streets';
const HOUSES_API_URL = 'https://app.yasno.ua/api/blackout-service/public/shutdowns/addresses/v2/houses';
const ADDRESS_API_URL = 'https://app.yasno.ua/api/blackout-service/public/shutdowns/addresses/v2/group';
const OUTAGES_API_URL = 'https://app.yasno.ua/api/blackout-service/public/shutdowns/regions/25/dsos/902/planned-outages';

const REGION_ID = '25';
const DSO_ID = '902';

const formatTime = (minutes) => {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
};

export async function GET(req) {
    const url = new URL(req.url);
    const streetName = url.searchParams.get('street');
    const houseName = url.searchParams.get('house');

    const streetsParams = new URLSearchParams({
        regionId: REGION_ID,
        dsoId: DSO_ID,
        query: streetName,
    });
    const streetsResponse = await fetch(`${STREETS_API_URL}?${streetsParams}`);
    const streets = await streetsResponse.json();
    if (streets.length === 0) {
        return Response.json({ error: `Street '${streetName}' not found` }, { status: 404 });
    }
    const street = streets[0];
    const streetId = street.id;

    const housesParams = new URLSearchParams({
        regionId: REGION_ID,
        dsoId: DSO_ID,
        streetId: streetId,
    });
    const housesResponse = await fetch(`${HOUSES_API_URL}?${housesParams}`);
    const houses = await housesResponse.json();
    const house = houses.find(h => h.value === houseName);
    if (!house) {
        return Response.json({ error: `House '${houseName}' not found` }, { status: 404 });
    }
    const houseId = house.id;

    const params = new URLSearchParams({
        regionId: REGION_ID,
        streetId: streetId,
        houseId: houseId,
        dsoId: DSO_ID,
    });

    const [groupData, outagesData] = await Promise.all([
        fetch(`${ADDRESS_API_URL}?${params}`).then(res => res.json()),
        fetch(OUTAGES_API_URL).then(res => res.json())
    ]);

    const today = outagesData[`${groupData.group}.${groupData.subgroup}`].today
    if (today.status == 'EmergencyShutdowns') {
        return Response.json('🚨 Emergency outages', { status: 200 });
    }

    const outages = today.slots
        .filter(o => o.type === 'Definite')
        .map(o => `${formatTime(o.start)} - ${formatTime(o.end)}`);

    return Response.json(outages);
}