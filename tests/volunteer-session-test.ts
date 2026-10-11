
import assert from "node:assert/strict";
import {
  createVolunteerSession,
  verifyVolunteerSession,
} from "../src/lib/auth/volunteer-session";

process.env.VOLUNTEER_SESSION_SECRET =
  "local-test-secret-at-least-32-characters-long";

const identity = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  code: "TEST-01",
  name: "Test Volunteer",
};

const token = createVolunteerSession(identity);

// A valid session should be accepted.
assert.deepEqual(verifyVolunteerSession(token)?.id, identity.id);

// A modified token should be rejected.
assert.equal(verifyVolunteerSession(token + "tampered"), null);

// A missing token should be rejected.
assert.equal(verifyVolunteerSession(undefined), null);

// A malformed token should be rejected.
assert.equal(verifyVolunteerSession("not-a-valid-token"), null);

console.log("Volunteer session tests passed: 4 checks.");
