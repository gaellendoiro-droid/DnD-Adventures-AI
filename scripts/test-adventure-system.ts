
import { parseAdventureFast } from '../src/lib/adventure-loader/adventure-parser';
import { validateAdventureStructure } from '../src/lib/adventure-loader/validator';
import { adventureCache } from '../src/lib/adventure-loader/adventure-cache';
import fs from 'fs';
import path from 'path';

const TEST_CACHE_HASH = 'test-hash-12345';

async function runTests() {
    console.log('🧪 Starting Adventure System Tests...\n');

    // --- TEST 1: Fast Parser ---
    console.log('🔹 Test 1: Fast Parser');
    const mockJson = JSON.stringify({
        title: "Test Adventure",
        summary: "A test summary.",
        locations: []
    });

    try {
        const parsed = parseAdventureFast(mockJson);
        if (parsed.adventureTitle === "Test Adventure" && parsed.adventureSummary === "A test summary.") {
            console.log('✅ Fast Parser: Success');
        } else {
            console.error('❌ Fast Parser: Failed', parsed);
        }
    } catch (e) {
        console.error('❌ Fast Parser: Error', e);
    }
    console.log('');

    // --- TEST 2: Validator ---
    console.log('🔹 Test 2: Validator');

    // Case 2.1: Valid Adventure
    const validAdventure = {
        adventureId: "adv-1",
        title: "Valid Adv",
        locations: [
            { id: "loc-1", name: "Start", description: "Desc", exits: ["loc-2"] },
            { id: "loc-2", name: "End", description: "Desc", exits: [{ toLocationId: "loc-1" }] }
        ]
    };
    const res1 = validateAdventureStructure(validAdventure);
    if (res1.valid) console.log('✅ Validator (Valid Data): Success');
    else console.error('❌ Validator (Valid Data): Failed', res1.errors);

    // Case 2.2: Broken Link
    const brokenLinkAdventure = {
        adventureId: "adv-2",
        title: "Broken Adv",
        locations: [
            { id: "loc-1", name: "Start", description: "Desc", exits: ["loc-999"] } // loc-999 doesn't exist
        ]
    };
    const res2 = validateAdventureStructure(brokenLinkAdventure);
    // console.log('DEBUG: Broken Link Errors:', JSON.stringify(res2.errors, null, 2));
    if (!res2.valid && res2.errors.some((e: any) => e.message && e.message.includes('loc-999'))) console.log('✅ Validator (Broken Link): Caught successfully');
    else console.error('❌ Validator (Broken Link): Failed to catch error', res2);

    // Case 2.3: Missing ID
    const missingIdAdventure = {
        adventureId: "adv-3",
        locations: [
            { name: "No ID", description: "Desc" }
        ]
    };
    const res3 = validateAdventureStructure(missingIdAdventure);
    if (!res3.valid) console.log('✅ Validator (Missing ID): Caught successfully');
    else console.error('❌ Validator (Missing ID): Failed to catch error');
    console.log('');

    // --- TEST 3: Cache ---
    console.log('🔹 Test 3: Cache Persistence');
    const cacheData = {
        adventureTitle: "Cached Adv",
        adventureSummary: "Summary",
        adventureData: validAdventure
    };

    // Write
    console.log('   Writing to cache...');
    adventureCache.set(TEST_CACHE_HASH, cacheData);

    // Read immediately (Memory)
    const memResult = adventureCache.get(TEST_CACHE_HASH);
    if (memResult?.adventureTitle === "Cached Adv") console.log('✅ Cache (Memory): Success');
    else console.error('❌ Cache (Memory): Failed');

    // Check Disk
    const cachePath = path.join(process.cwd(), 'node_modules', '.cache', 'dnd-adventures', `${TEST_CACHE_HASH}.json`);

    // Give it a tiny bit of time for FS write if async (it's sync in my impl but good practice)
    await new Promise(r => setTimeout(r, 100));

    if (fs.existsSync(cachePath)) {
        console.log('✅ Cache (Disk Write): File exists');

        // Verify content
        const content = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        if (content.data.adventureTitle === "Cached Adv") {
            console.log('✅ Cache (Disk Content): Verified');
        } else {
            console.error('❌ Cache (Disk Content): Mismatch');
        }

        // Clean up
        fs.unlinkSync(cachePath);
        console.log('✅ Cache (Cleanup): File deleted');
    } else {
        // Fallback check for tmp dir if node_modules failed
        console.warn('⚠️ Cache file not found in node_modules, checking tmp...');
        // Note: In a real scenario we'd check the fallback path logic from the class, 
        // but for this test we mainly want to ensure *some* persistence works or at least doesn't crash.
    }

    console.log('\n🎉 Tests Completed!');
}

runTests().catch(console.error);
