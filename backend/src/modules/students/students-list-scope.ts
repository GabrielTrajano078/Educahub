import { Types } from "mongoose";
import type { z } from "zod";
import type { AuthUser } from "../../types/auth";
import { escapeRegex } from "../../lib/escape-regex";
import { listStudentsSchema } from "./students.schemas";
import { classroomIdsForGrade } from "./students.server-logic";

export type ListStudentsFilters = z.infer<typeof listStudentsSchema>;

export type ListStudentsComputation =
  | { action: "json"; body: unknown }
  | { action: "status_json"; status: 403; body: { message: string } }
  | { action: "find"; query: Record<string, unknown> };

function applyProfessorListScope(
  query: Record<string, unknown>,
  filters: ListStudentsFilters,
  user: AuthUser,
  gradeClassroomIds: Types.ObjectId[] | undefined,
): ListStudentsComputation {
  if (!user.schoolId) {
    return { action: "status_json", status: 403, body: { message: "Usuario sem escola vinculada." } };
  }
  query.schoolId = user.schoolId;
  const assigned = user.classroomIds.filter((id) => Types.ObjectId.isValid(id));
  if (assigned.length === 0) {
    return { action: "json", body: [] };
  }
  const assignedOid = assigned.map((id) => new Types.ObjectId(id));
  if (filters.classroomId) {
    if (!assigned.includes(filters.classroomId)) {
      return { action: "json", body: [] };
    }
  } else if (gradeClassroomIds) {
    const allowed = new Set(gradeClassroomIds.map(String));
    const pool = assignedOid.filter((id) => allowed.has(String(id)));
    if (pool.length === 0) {
      return { action: "json", body: [] };
    }
    query.classroomId = { $in: pool };
  } else {
    query.classroomId = { $in: assignedOid };
  }
  return { action: "find", query };
}

function applyCoordenadorListScope(
  query: Record<string, unknown>,
  filters: ListStudentsFilters,
  user: AuthUser,
  gradeClassroomIds: Types.ObjectId[] | undefined,
): ListStudentsComputation {
  if (!user.schoolId) {
    return { action: "status_json", status: 403, body: { message: "Usuario sem escola vinculada." } };
  }
  query.schoolId = user.schoolId;
  if (!filters.classroomId && gradeClassroomIds) {
    query.classroomId = { $in: gradeClassroomIds };
  }
  return { action: "find", query };
}

function applyAdminGestorListScope(
  query: Record<string, unknown>,
  filters: ListStudentsFilters,
  gradeClassroomIds: Types.ObjectId[] | undefined,
): ListStudentsComputation {
  if (filters.schoolId) {
    query.schoolId = filters.schoolId;
  }
  if (!filters.classroomId && gradeClassroomIds) {
    query.classroomId = { $in: gradeClassroomIds };
  }
  return { action: "find", query };
}

export async function computeListStudentsComputation(
  filters: ListStudentsFilters,
  user: AuthUser,
): Promise<ListStudentsComputation> {
  let gradeClassroomIds: Types.ObjectId[] | undefined;
  const useGradeFilter = Boolean(filters.grade && !filters.classroomId);
  if (useGradeFilter && filters.grade) {
    gradeClassroomIds = await classroomIdsForGrade(filters.grade, filters.schoolId, user);
    if (gradeClassroomIds.length === 0) {
      return { action: "json", body: [] };
    }
  }

  const query: Record<string, unknown> = {};
  const nameTrim = filters.fullNameContains?.trim();
  if (nameTrim) {
    query.fullName = { $regex: escapeRegex(nameTrim), $options: "i" };
  }
  if (filters.classroomId) {
    query.classroomId = new Types.ObjectId(filters.classroomId);
  }

  if (user.role === "professor") {
    return applyProfessorListScope(query, filters, user, gradeClassroomIds);
  }
  if (user.role === "coordenador") {
    return applyCoordenadorListScope(query, filters, user, gradeClassroomIds);
  }
  return applyAdminGestorListScope(query, filters, gradeClassroomIds);
}
