"use server";

import database from "@/app/lib/mongo";
export async function createNote() {
  try {
    const result = await database.collection("notes").findOne();

    if (result?._id) {
      return { success: true };
    }

    const note = {
      content: {},
    };
    const out = await database.collection("notes").insertOne(note);
    if (!out) {
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
}

export async function updateNote(content: string | undefined) {
  try {
    if (!content) {
      return { success: true };
    }
    const delta = JSON.parse(content);
    database.collection("notes").updateOne({}, { $set: { content: delta } });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
}

export async function getNote() {
  try {
    const result = await database.collection("notes").findOne();
    if (!result) {
      return { success: false };
    }

    const note = { id: result?._id.toString(), content: result?.content };
    return { note, success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
}
