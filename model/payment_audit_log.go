package model

import (
	"github.com/QuantumNous/new-api/common"
)

// 支付审计事件类型
const (
	PaymentAuditEventCreate   = "create"   // 订单创建
	PaymentAuditEventNotify   = "notify"   // 异步通知
	PaymentAuditEventQuery    = "query"    // 主动查询
	PaymentAuditEventRecharge = "recharge" // 加款执行
)

// 支付审计状态
const (
	PaymentAuditStatusSuccess = "success"
	PaymentAuditStatusFailed  = "failed"
	PaymentAuditStatusInfo    = "info"
)

// PaymentAuditLog 支付审计追溯日志。
// 记录支付全链路关键事件：订单创建、webhook 通知、主动查询、加款结果。
// RawPayload 不返回前端（json:"-"），仅管理员可通过后台查询。
type PaymentAuditLog struct {
	Id         int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	TradeNo    string `json:"trade_no" gorm:"type:varchar(255);index"`
	EventType  string `json:"event_type" gorm:"type:varchar(64);index"`
	Provider   string `json:"provider" gorm:"type:varchar(50);default:''"`
	Status     string `json:"status" gorm:"type:varchar(32)"`
	RawPayload string `json:"-" gorm:"type:text"`
	Detail     string `json:"detail" gorm:"type:text"`
	ClientIP   string `json:"client_ip" gorm:"type:varchar(64);default:''"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint;index"`
}

func (PaymentAuditLog) TableName() string {
	return "payment_audit_logs"
}

// InsertPaymentAuditLog 写入一条支付审计日志。
// 尽力写入，失败时仅通过 common.SysError 上报，不影响支付主流程。
func InsertPaymentAuditLog(auditLog *PaymentAuditLog) {
	if auditLog == nil || auditLog.TradeNo == "" {
		return
	}
	if auditLog.CreatedAt == 0 {
		auditLog.CreatedAt = common.GetTimestamp()
	}
	if err := DB.Create(auditLog).Error; err != nil {
		common.SysError("支付审计日志写入失败 trade_no=" + auditLog.TradeNo + " error=" + err.Error())
	}
}
