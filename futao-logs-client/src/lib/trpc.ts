import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../../futao-logs-server/server/routerTrpc/_app';

export const trpc = createTRPCReact<AppRouter>();
