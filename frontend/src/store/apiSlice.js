import { createApi } from '@reduxjs/toolkit/query/react';
import api from '../api/axios';

const axiosBaseQuery = () => async ({ url, method, data, params }) => {
  try {
    const result = await api({ url, method, data, params });
    return { data: result.data };
  } catch (axiosError) {
    return {
      error: {
        status: axiosError.response?.status,
        data: axiosError.response?.data || axiosError.message,
      },
    };
  }
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Attendance', 'Leaves', 'Holidays', 'ChatMessages', 'ChatServers', 'ChatMembers'],
  keepUnusedDataFor: 86400, // Keep cache for 24 hours to prevent refetch on page navigation
  endpoints: (builder) => ({
    // Attendance summary
    getMySummary: builder.query({
      query: ({ year, month }) => ({
        url: `/attendance/my-summary?year=${year}&month=${month}`,
        method: 'GET'
      }),
      providesTags: ['Attendance', 'Holidays']
    }),
    
    // Team today attendance
    getTeamToday: builder.query({
      query: () => ({
        url: '/attendance/team-today',
        method: 'GET'
      }),
      providesTags: ['Attendance']
    }),

    // Check-in
    checkIn: builder.mutation({
      query: () => ({
        url: '/attendance/check-in',
        method: 'POST'
      }),
      invalidatesTags: ['Attendance']
    }),

    // Check-out
    checkOut: builder.mutation({
      query: () => ({
        url: '/attendance/check-out',
        method: 'POST'
      }),
      invalidatesTags: ['Attendance']
    }),

    // Get My Leaves
    getMyLeaves: builder.query({
      query: () => ({
        url: '/attendance/leave-requests/my',
        method: 'GET'
      }),
      providesTags: ['Leaves']
    }),

    // Get Team Leaves approvals inbox
    getTeamLeaves: builder.query({
      query: () => ({
        url: '/attendance/leave-requests/team',
        method: 'GET'
      }),
      providesTags: ['Leaves']
    }),

    // Apply for leave
    applyLeave: builder.mutation({
      query: (data) => ({
        url: '/attendance/leave-request',
        method: 'POST',
        data
      }),
      invalidatesTags: ['Leaves']
    }),

    // Update leave status (approve/reject)
    updateLeaveStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/attendance/leave-request/${id}/status`,
        method: 'PUT',
        data: { status }
      }),
      invalidatesTags: ['Leaves', 'Attendance']
    }),

    // Get all holidays list
    getAllHolidays: builder.query({
      query: () => ({
        url: '/attendance/holidays',
        method: 'GET'
      }),
      providesTags: ['Holidays']
    }),

    // Add office holiday
    addHoliday: builder.mutation({
      query: (data) => ({
        url: '/attendance/holiday',
        method: 'POST',
        data
      }),
      invalidatesTags: ['Holidays', 'Attendance']
    }),

    // Delete office holiday
    deleteHoliday: builder.mutation({
      query: (id) => ({
        url: `/attendance/holiday/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Holidays', 'Attendance']
    }),

    // --- Chat API Endpoints ---
    getChatServers: builder.query({
      query: () => ({
        url: '/chat/servers',
        method: 'GET'
      }),
      providesTags: ['ChatServers']
    }),

    createChatServer: builder.mutation({
      query: (data) => ({
        url: '/chat/server',
        method: 'POST',
        data
      }),
      invalidatesTags: ['ChatServers']
    }),

    updateChatServer: builder.mutation({
      query: ({ id, name, companyIds }) => ({
        url: `/chat/server/${id}`,
        method: 'PUT',
        data: { name, companyIds }
      }),
      invalidatesTags: ['ChatServers', 'ChatMembers']
    }),

    deleteChatServer: builder.mutation({
      query: (id) => ({
        url: `/chat/server/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['ChatServers', 'ChatMembers']
    }),

    getChatMessages: builder.query({
      query: ({ chatServerId, companyId, receiverId }) => ({
        url: `/chat/messages?chatServerId=${chatServerId || ''}&companyId=${companyId || ''}&receiverId=${receiverId || ''}`,
        method: 'GET'
      }),
      providesTags: ['ChatMessages']
    }),

    sendChatMessage: builder.mutation({
      query: (data) => ({
        url: '/chat/message',
        method: 'POST',
        data
      }),
      invalidatesTags: ['ChatMessages']
    }),

    getChatMembers: builder.query({
      query: () => ({
        url: '/chat/members',
        method: 'GET'
      }),
      providesTags: ['ChatMembers']
    })
  })
});

export const {
  useGetMySummaryQuery,
  useGetTeamTodayQuery,
  useCheckInMutation,
  useCheckOutMutation,
  useGetMyLeavesQuery,
  useGetTeamLeavesQuery,
  useApplyLeaveMutation,
  useUpdateLeaveStatusMutation,
  useGetAllHolidaysQuery,
  useAddHolidayMutation,
  useDeleteHolidayMutation,
  
  // Chat hooks
  useGetChatServersQuery,
  useCreateChatServerMutation,
  useUpdateChatServerMutation,
  useDeleteChatServerMutation,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useGetChatMembersQuery
} = apiSlice;
