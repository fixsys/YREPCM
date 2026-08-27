const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/laborReports.ts', 'utf8');

const newRoute = `
// Delete labor report
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'SystemAdmin') return res.status(403).json({ error: '權限不足，僅系統管理員可刪除' });
  try {
    await prisma.dailyLaborReport.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除失敗' });
  }
});
`;

code = code.replace(/export default router;/, newRoute + '\nexport default router;');

fs.writeFileSync('backend/src/routes/laborReports.ts', code, 'utf8');
