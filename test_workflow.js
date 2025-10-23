// Test DVDPlay workflow without TMDB API dependency
const { searchContent, extractDownloadLinks, processDownloadLink } = require('./providers/dvdplay.js');

async function testDVDPlayWorkflow() {
    console.log('🎬 Testing DVDPlay workflow without TMDB API...\n');
    
    try {
        // Test search functionality
        console.log('🔍 Testing search functionality...');
        const searchResults = await searchContent('They Call Him OG');
        
        console.log(`📊 Search results: Found ${searchResults.length} results`);
        
        if (searchResults.length > 0) {
            console.log('\n📋 Search results:');
            searchResults.forEach((result, index) => {
                console.log(`${index + 1}. ${result.title}`);
                console.log(`   URL: ${result.url}`);
            });
            
            // Test download link extraction
            console.log('\n🔗 Testing download link extraction...');
            const selectedResult = searchResults[0]; // Use first result
            const downloadLinks = await extractDownloadLinks(selectedResult.url);
            
            console.log(`📊 Download pages found: ${downloadLinks.length}`);
            
            if (downloadLinks.length > 0) {
                console.log('\n📋 Download pages:');
                downloadLinks.forEach((link, index) => {
                    console.log(`${index + 1}. ${link}`);
                });
                
                // Test stream extraction from first download page
                console.log('\n🎯 Testing stream extraction...');
                const streams = await processDownloadLink(downloadLinks[0]);
                
                console.log(`📊 Streams found: ${streams.length}`);
                
                if (streams.length > 0) {
                    console.log('\n✅ SUCCESS: Complete workflow is working!');
                    console.log('\n🎯 Available streams:');
                    streams.forEach((stream, index) => {
                        console.log(`${index + 1}. ${stream.name}`);
                        console.log(`   Quality: ${stream.quality}`);
                        console.log(`   Size: ${stream.size || 'Unknown'}`);
                        console.log(`   URL: ${stream.url.substring(0, 80)}...`);
                        console.log(`   Type: ${stream.type}`);
                        if (stream.fileName) {
                            console.log(`   Filename: ${stream.fileName}`);
                        }
                        console.log('');
                    });
                } else {
                    console.log('❌ No streams extracted from download page');
                }
            } else {
                console.log('❌ No download pages found');
            }
        } else {
            console.log('❌ No search results found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testDVDPlayWorkflow().then(() => {
    console.log('\n✅ Workflow test completed');
}).catch(error => {
    console.error('💥 Test crashed:', error);
});
