// Test file for HDHub4u provider
const { getStreams } = require('./providers/hdhub4u.js');

// Test with a popular movie (The Dark Knight - TMDB ID: 155)
console.log('Testing HDHub4u provider with The Dark Knight (TMDB ID: 155)...');

getStreams('155', 'movie').then(streams => {
    console.log(`✅ Found ${streams.length} streams for The Dark Knight`);
    if (streams.length > 0) {
        console.log('\n📋 Full Stream Objects (first 2):');
        streams.slice(0, 2).forEach((stream, index) => {
            console.log(`\n--- Stream ${index + 1} ---`);
            console.log(JSON.stringify(stream, null, 2));
        });

        console.log('\n📊 Stream Summary:');
        streams.slice(0, 5).forEach((stream, index) => {
            console.log(`  ${index + 1}. ${stream.name} | Quality: ${stream.quality} | Size: ${stream.size}`);
        });
    }
}).catch(error => {
    console.error('❌ Error:', error.message);
});

// Test with a TV show (Breaking Bad - TMDB ID: 1396, Season 1, Episode 1)
console.log('\nTesting HDHub4u provider with Breaking Bad S01E01...');

getStreams('1396', 'tv', 1, 1).then(streams => {
    console.log(`✅ Found ${streams.length} streams for Breaking Bad S01E01`);
    if (streams.length > 0) {
        console.log('\n📋 All Stream Objects:');
        streams.forEach((stream, index) => {
            console.log(`\n--- Stream ${index + 1} ---`);
            console.log(`Name: ${stream.name}`);
            console.log(`Title: ${stream.title}`);
            console.log(`Quality: ${stream.quality}`);
            console.log(`Size: ${stream.size}`);
            console.log(`URL: ${stream.url.substring(0, 80)}...`);
        });

        console.log('\n📊 Stream Summary by Quality:');
        const qualityGroups = streams.reduce((acc, stream) => {
            const quality = stream.quality;
            if (!acc[quality]) acc[quality] = [];
            acc[quality].push(stream);
            return acc;
        }, {});

        Object.keys(qualityGroups).forEach(quality => {
            console.log(`\n${quality} (${qualityGroups[quality].length} streams):`);
            qualityGroups[quality].forEach((stream, idx) => {
                console.log(`  ${idx + 1}. ${stream.name}`);
            });
        });
    }
}).catch(error => {
    console.error('❌ Error:', error.message);
});
