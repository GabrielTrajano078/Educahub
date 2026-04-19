import { Types } from "mongoose";
import { ResultModel } from "./result.model";

export async function aggregateDescriptorStats(answerSheetIds: Types.ObjectId[]) {
  if (!answerSheetIds.length) return [];

  return ResultModel.aggregate([
    { $match: { answerSheetId: { $in: answerSheetIds } } },
    {
      $lookup: {
        from: "questions",
        localField: "questionId",
        foreignField: "_id",
        as: "question",
      },
    },
    { $unwind: "$question" },
    {
      $group: {
        _id: "$question.descriptor",
        total: { $sum: 1 },
        correct: { $sum: { $cond: ["$isCorrect", 1, 0] } },
        axis: { $first: "$question.axis" },
      },
    },
    {
      $project: {
        _id: 0,
        descriptor: "$_id",
        axis: 1,
        total: 1,
        correct: 1,
        accuracy: {
          $round: [{ $multiply: [{ $divide: ["$correct", "$total"] }, 100] }, 2],
        },
      },
    },
    { $sort: { descriptor: 1 } },
  ]);
}

export async function aggregateAxisStats(answerSheetIds: Types.ObjectId[]) {
  if (!answerSheetIds.length) return [];

  return ResultModel.aggregate([
    { $match: { answerSheetId: { $in: answerSheetIds } } },
    {
      $lookup: {
        from: "questions",
        localField: "questionId",
        foreignField: "_id",
        as: "question",
      },
    },
    { $unwind: "$question" },
    {
      $group: {
        _id: { $ifNull: ["$question.axis", "SEM_EIXO"] },
        total: { $sum: 1 },
        correct: { $sum: { $cond: ["$isCorrect", 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        axis: "$_id",
        total: 1,
        correct: 1,
        accuracy: {
          $round: [{ $multiply: [{ $divide: ["$correct", "$total"] }, 100] }, 2],
        },
      },
    },
    { $sort: { axis: 1 } },
  ]);
}
