
import { narrativeExpert } from '../../src/ai/flows/narrative-manager';
import { config } from 'dotenv';

// Load environment variables
config();

async function runTests() {
    console.log("🧪 Starting NarrativeManager Verification...\n");

    const locationContext = JSON.stringify({
        id: "tavern",
        title: "The Rusty Mug",
        description: "A dim, smoky tavern smelling of stale ale and roasting meat. A fire crackles in the hearth.",
        interactables: [],
        entitiesPresent: []
    });

    const npcContext = JSON.stringify({
        name: "Grom",
        role: "Barkeep",
        personality: "Gruff but fair. Hates goblins.",
        attitude: "Neutral"
    });

    // Test 1: Exploration
    console.log("--- TEST 1: EXPLORATION (Looking at the fire) ---");
    try {
        const result1 = await narrativeExpert({
            playerAction: "I look closely at the fire.",
            locationId: "tavern",
            locationContext: locationContext,
            interpretedAction: JSON.stringify({ actionType: 'interact', targetId: 'fire' }),
            conversationHistory: ""
        });
        console.log("📝 Result:", result1.dmNarration);
        console.log("✅ Test 1 Completed\n");
    } catch (e) {
        console.error("❌ Test 1 Failed:", e);
    }

    // Test 2: Interaction
    console.log("--- TEST 2: INTERACTION (Talking to Grom) ---");
    try {
        const result2 = await narrativeExpert({
            playerAction: "I ask Grom for a beer.",
            locationId: "tavern",
            locationContext: npcContext, // Passing NPC context as location context for this test
            interpretedAction: JSON.stringify({ actionType: 'interact', targetId: 'Grom' }),
            conversationHistory: ""
        });
        console.log("📝 Result:", result2.dmNarration);
        console.log("✅ Test 2 Completed\n");
    } catch (e) {
        console.error("❌ Test 2 Failed:", e);
    }

    // Test 3: Hybrid
    console.log("--- TEST 3: HYBRID (Walking and Talking) ---");
    try {
        const result3 = await narrativeExpert({
            playerAction: "I walk to the bar and ask Grom if he's seen any goblins.",
            locationId: "tavern",
            locationContext: locationContext, // Should ideally contain both env and NPC info
            interpretedAction: JSON.stringify({ actionType: 'interact', targetId: 'Grom' }), // Simplified interpretation
            conversationHistory: ""
        });
        console.log("📝 Result:", result3.dmNarration);
        console.log("✅ Test 3 Completed\n");
    } catch (e) {
        console.error("❌ Test 3 Failed:", e);
    }
}

runTests();
