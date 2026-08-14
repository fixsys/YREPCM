import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

// 檢查是否具有特定權限等級以上 (例如：管理員 level 100)
export const requireLevel = (requiredLevel: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未授權' });
    }

    if (req.user.level < requiredLevel) {
      return res.status(403).json({ error: '權限不足' });
    }

    next();
  };
};

// 檢查是否為特定部門或高階主管
export const requireDepartmentOrHigher = (departments: string[], requiredLevel = 50) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未授權' });
    }

    // 高階主管擁有全域權限
    if (req.user.level >= requiredLevel) {
      return next();
    }

    // 檢查部門是否符合
    if (departments.includes(req.user.department)) {
      return next();
    }

    return res.status(403).json({ error: '權限不足，非專屬部門' });
  };
};
